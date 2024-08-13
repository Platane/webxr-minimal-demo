import { vec3, mat4 } from "gl-matrix";
import { createRenderer } from "./renderer";

const root = document.getElementById("root")!;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2", { xrCompatible: true })!;

const { render, onResize } = createRenderer(canvas, gl);
document.addEventListener("resize", onResize, {});

(async () => {
  const origin = mat4.create();
  const planted: mat4[] = [];

  const navigatorXR = navigator.xr;

  if (
    !navigatorXR ||
    (await navigatorXR.isSessionSupported("immersive-ar")) !== true
  ) {
    root.innerText = "unsupported";
    return;
  }

  const init = async () => {
    const session = await navigatorXR.requestSession("immersive-ar", {
      optionalFeatures: [
        "dom-overlay",
        // "hit-test",
        "local-floor",
        "light-estimation",
      ],
      domOverlay: { root: root },
    });

    await gl.makeXRCompatible();

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    onResize();

    let localReferenceSpace: XRReferenceSpace;

    session.requestReferenceSpace("local-floor").then((r) => {
      localReferenceSpace = r;

      localReferenceSpace.addEventListener("reset", (evt) => {
        console.log("reset");
        if (evt.transform) {
          // AR experiences typically should stay grounded to the real world.
          // If there's a known origin shift, compensate for it here.
          localReferenceSpace = localReferenceSpace.getOffsetReferenceSpace(
            evt.transform
          );
        }
      });
    });

    session.addEventListener("select", (event) => {
      // console.log("select", event);
    });

    let poseFoundOnce = false;
    let clicked: { x: number; y: number } | undefined;

    const projectionMatrix = mat4.create();
    const depthCorrection = mat4.create();
    mat4.fromScaling(depthCorrection, [1, 1, 0.001]);

    let cancel: number;

    const lightProbe = await (session as any)?.requestLightProbe();

    const onXRFrame = (t: number, frame: XRFrame) => {
      const glLayer = session.renderState.baseLayer!;
      const pose =
        localReferenceSpace && frame.getViewerPose(localReferenceSpace);

      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

      if ((frame as any).getLightEstimate && lightProbe) {
        const lightEstimate = (frame as any).getLightEstimate(lightProbe);

        if (lightEstimate) {
          const intensity = Math.max(
            1.0,
            lightEstimate.primaryLightIntensity.x,
            lightEstimate.primaryLightIntensity.y,
            lightEstimate.primaryLightIntensity.z
          );

          const r = lightEstimate.primaryLightIntensity.x / intensity;
          const g = lightEstimate.primaryLightIntensity.y / intensity;
          const b = lightEstimate.primaryLightIntensity.z / intensity;
        }
      }

      if (pose) {
        if (!poseFoundOnce) {
          console.log("found a suitable pose");
          poseFoundOnce = true;
        }

        const view = pose.views[0];
        const viewport = glLayer.getViewport(view)!;

        mat4.multiply(projectionMatrix, depthCorrection, view.projectionMatrix);

        {
          const ray = { origin: vec3.create(), direction: vec3.create() };
          getViewRay(ray, view, 0, 0);

          const o = vec3.create();

          vec3.set(o, 99999, 99999, 99999);
          raycastToGround(o, ray);

          mat4.fromRotationTranslationScale(
            origin,
            [0, 0, 0, 1],
            o,
            [0.1, 0.1, 0.1]
          );
        }

        if (clicked) {
          const ray = { origin: vec3.create(), direction: vec3.create() };
          getViewRay(ray, view, clicked.x, clicked.y);

          const o = vec3.create();

          if (raycastToGround(o, ray)) {
            const m = mat4.create();

            mat4.fromRotationTranslationScale(
              m,
              [0, 0, 0, 1],
              o,
              [0.05, 0.05, 0.05]
            );

            planted.push(m);
          }

          clicked = undefined;
        }

        render(
          //
          viewport,
          projectionMatrix as Float32Array,
          view.transform.inverse.matrix,
          [origin, ...planted] as Float32Array[]
        );
      }

      cancel = session.requestAnimationFrame(onXRFrame);
    };

    cancel = session.requestAnimationFrame(onXRFrame);

    document.addEventListener("click", ({ clientX, clientY }) => {
      const { top, left, width, height } = canvas.getBoundingClientRect();

      clicked = {
        x: ((clientX - left) / width) * 2 - 1,
        y: -(((clientY - top) / height) * 2 - 1),
      };
    });

    return () => {
      session.cancelAnimationFrame(cancel);
      session.end();
    };
  };

  root.innerText = "click to start";
  document.addEventListener("click", init, { once: true });
})();

const getViewRay = (
  out: {
    origin: vec3;
    direction: vec3;
  },
  view: XRView,
  viewportX: number,
  viewportY: number
) => {
  const m = mat4.create();
  mat4.multiply(m, view.projectionMatrix, view.transform.inverse.matrix);
  mat4.invert(m, m);

  out.origin[0] = view.transform.position.x;
  out.origin[1] = view.transform.position.y;
  out.origin[2] = view.transform.position.z;

  vec3.transformMat4(out.direction, [viewportX, viewportY, 0.5], m);
  vec3.subtract(out.direction, out.direction, out.origin);
  vec3.normalize(out.direction, out.direction);
};

const raycastToGround = (
  out: vec3,
  ray: {
    origin: vec3;
    direction: vec3;
  },
  yGround = 0
) => {
  const t = -(ray.origin[1] - yGround) / ray.direction[1];

  if (t > 0) {
    vec3.scaleAndAdd(out, ray.origin, ray.direction, t);
    return true;
  }

  return false;
};
