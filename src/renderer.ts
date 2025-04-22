export const createRenderer = (gl: WebGL2RenderingContext) => {
	const vertexShaderCode = `
    #version 300 es

    in vec4 a_position;
    in vec3 a_color;

    out vec3 v_color;

    uniform mat4 u_projectionMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_modelMatrix;

    void main() {
      gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * a_position;
      v_color = a_color;
    }
  `.trim();

	const fragmentShaderCode = `
    #version 300 es
    precision highp float;

    in vec3 v_color;

    out vec4 outColor;

    void main() {
      outColor = vec4(v_color, 1.0);
    }
  `.trim();

	const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
	gl.shaderSource(vertexShader, vertexShaderCode);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
		throw "vertex shader error: " + gl.getShaderInfoLog(vertexShader) || "";

	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
	gl.shaderSource(fragmentShader, fragmentShaderCode);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
		throw "fragment shader error: " + gl.getShaderInfoLog(fragmentShader) || "";

	const program = gl.createProgram()!;
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw "Unable to initialize the shader program.";

	const u_viewMatrix = gl.getUniformLocation(program, "u_viewMatrix");
	const u_projectionMatrix = gl.getUniformLocation(
		program,
		"u_projectionMatrix",
	);
	const u_modelMatrix = gl.getUniformLocation(program, "u_modelMatrix");

	const a_position = gl.getAttribLocation(program, "a_position");
	const a_color = gl.getAttribLocation(program, "a_color");

	const createModelRenderer = ({
		positions,
		colors,
	}: { positions: Float32Array; colors: Float32Array }) => {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(a_position);
		gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);

		const colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(a_color);
		gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);

		const nTriangles = positions.length / 3;

		const draw = (transform: Float32Array) => {
			gl.bindVertexArray(vao);
			gl.uniformMatrix4fv(u_modelMatrix, false, transform);
			gl.drawArrays(gl.TRIANGLES, 0, nTriangles);
		};

		return { draw };
	};

	const render = (
		projectionMatrix: Float32Array,
		viewMatrix: Float32Array,
		draw: () => void,
	) => {
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.useProgram(program);

		gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix);

		draw();
	};

	return { render, createModelRenderer };
};

// biome-ignore format: .
export const cube = {
	positions: new Float32Array([

     1, 1, 1,
    -1,-1, 1,
     1,-1, 1,

    -1,-1, 1,
     1, 1, 1,
    -1, 1, 1,


     1, 1,-1,
     1,-1,-1,
    -1,-1,-1,

    -1,-1,-1,
    -1, 1,-1,
     1, 1,-1,


     1, 1, 1,
     1,-1,-1,
     1, 1,-1,

     1,-1,-1,
     1, 1, 1,
     1,-1, 1,


    -1, 1, 1,
    -1, 1,-1,
    -1,-1,-1,

    -1,-1,-1,
    -1,-1, 1,
    -1, 1, 1,


     1,-1, 1,
    -1,-1,-1,
     1,-1,-1,

    -1,-1,-1,
     1,-1, 1,
    -1,-1, 1,

     1, 1, 1,
     1, 1,-1,
    -1, 1,-1,

     1, 1, 1,
    -1, 1,-1,
    -1, 1, 1,

  ]),
	colors: new Float32Array([
     0, 0, 1,
     0, 0, 1,
     0, 0, 1,

     0, 0, 1,
     0, 0, 1,
     0, 0, 1,

     1, 1, 0,
     1, 1, 0,
     1, 1, 0,

     1, 1, 0,
     1, 1, 0,
     1, 1, 0,

     1, 0, 0,
     1, 0, 0,
     1, 0, 0,

     1, 0, 0,
     1, 0, 0,
     1, 0, 0,

     0, 1, 1,
     0, 1, 1,
     0, 1, 1,

     0, 1, 1,
     0, 1, 1,
     0, 1, 1,

     1, 0, 1,
     1, 0, 1,
     1, 0, 1,

     1, 0, 1,
     1, 0, 1,
     1, 0, 1,

     0, 1, 0,
     0, 1, 0,
     0, 1, 0,

     0, 1, 0,
     0, 1, 0,
     0, 1, 0,
  ]),
};
