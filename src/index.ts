import { vec3, mat4 } from "gl-matrix";
import { createRenderer } from "./render";

//
//
//

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const root = document.getElementById("root")!;
const gl = canvas.getContext("webgl2", { xrCompatible: true })!;

const { render, onResize } = createRenderer(canvas, gl);

document.addEventListener("resize", onResize, {});

document.body.appendChild(canvas);

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
    const session = await navigatorXR.requestSession("immersive-ar");

    gl.makeXRCompatible().then(() => {
      session.updateRenderState({
        baseLayer: new XRWebGLLayer(session, gl),
      });
    });

    let referenceSpace: XRReferenceSpace | XRBoundedReferenceSpace;

    session.requestReferenceSpace("local").then((r) => {
      referenceSpace = r;

      referenceSpace.addEventListener("reset", (evt) => {
        console.log("reset");
        if (evt.transform) {
          // AR experiences typically should stay grounded to the real world.
          // If there's a known origin shift, compensate for it here.
          referenceSpace = referenceSpace.getOffsetReferenceSpace(
            evt.transform
          );
        }
      });
    });

    let poseFoundOnce = false;
    let clicked: { x: number; y: number } | undefined;

    const projectionMatrix = mat4.create();
    const depthCorrection = mat4.create();
    mat4.fromScaling(depthCorrection, [1, 1, 0.001]);

    let cancel: number;

    const onXRFrame = (t: number, frame: XRFrame) => {
      const glLayer = session.renderState.baseLayer!;
      const pose = referenceSpace && frame.getViewerPose(referenceSpace);

      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

      if (pose) {
        if (!poseFoundOnce) {
          console.log("found a suitable pose");
          poseFoundOnce = true;
        }

        // Loop through each of the views reported by the frame and draw them
        // into the corresponding viewport.

        const view = pose.views[0];
        const viewport = glLayer.getViewport(view);

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
              [0.1, 0.1, 0.1]
            );

            planted.push(m);
          }

          clicked = undefined;
        }

        render(
          //
          projectionMatrix,
          view.transform.inverse.matrix,
          [origin, ...planted]
        );
      }

      cancel = session.requestAnimationFrame(onXRFrame);
    };

    cancel = session.requestAnimationFrame(onXRFrame);

    document.addEventListener("click", ({ pageX, pageY }) => {
      clicked = {
        x: (pageX / window.innerWidth) * 2 - 1,
        y: -((pageY / window.innerHeight) * 2 - 1),
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
