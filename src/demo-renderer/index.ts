import { mat4 } from "gl-matrix";
import { createRenderer, cube } from "../renderer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

const { render, createModelRenderer } = createRenderer(gl);
const cubeRenderer = createModelRenderer(cube);

//
//
//

const dpr = window.devicePixelRatio ?? 1;
const aspect = canvas.clientWidth / canvas.clientHeight;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

gl.viewport(0, 0, canvas.width, canvas.height);

gl.clearColor(0.98, 0.95, 0.9, 1);

const projectionMatrix = mat4.create() as Float32Array;
mat4.perspective(projectionMatrix, 70, aspect, 0.1, 200);

const viewMatrix = mat4.create() as Float32Array;
mat4.lookAt(viewMatrix, [4, 4, 4], [0, 0, 0], [0, 1, 0]);

const modelMatrix = mat4.create() as Float32Array;
mat4.fromTranslation(modelMatrix, [0, 0, 0]);

//
//
//

const loop = () => {
	const a = Date.now() / 1000;
	mat4.lookAt(
		viewMatrix,
		[Math.sin(a) * 4, 4, Math.cos(a) * 4],
		[0, 0, 0],
		[0, 1, 0],
	);

	//

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	render(projectionMatrix, viewMatrix, () => cubeRenderer.draw(modelMatrix));
	requestAnimationFrame(loop);
};
loop();
