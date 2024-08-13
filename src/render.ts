/**
 * very simple shader program to render a list of points as pyramids
 */
export const createRenderer = (
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext
) => {
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
    "u_projectionMatrix"
  );
  const u_modelMatrix = gl.getUniformLocation(program, "u_modelMatrix");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  {
    //prettier-ignore
    const positions = [
      0.0, 1, 0.0,
      0.0, 0.0, 1,
      0.0, 0.0, 0.0,

      0.0, 1, 0.0,
      1, 0.0, 0.0,
      0.0, 0.0, 0.0,

      0.0, 0.0, 1,
      1, 0.0, 0.0,
      0.0, 0.0, 0.0,
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
  }

  {
    //prettier-ignore
    const colors = [
      0.0, 0.3, 0.5,
      0.0, 0.3, 0.5,
      0.0, 0.3, 0.5,

      0.3, 0.5, 0,
      0.3, 0.5, 0,
      0.3, 0.5, 0,

      0.3, 0, 0.5,
      0.3, 0, 0.5,
      0.3, 0, 0.5,
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const a_color = gl.getAttribLocation(program, "a_color");
    gl.enableVertexAttribArray(a_color);
    gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);
  }

  gl.bindVertexArray(null);

  const render = (
    projectionMatrix: ArrayLike<number> | Float32Array,
    viewMatrix: ArrayLike<number> | Float32Array,
    models: (ArrayLike<number> | Float32Array)[]
  ) => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    //

    gl.useProgram(program);

    gl.disable(gl.CULL_FACE);

    gl.bindVertexArray(vao);

    gl.uniformMatrix4fv(
      u_projectionMatrix,
      false,
      new Float32Array(projectionMatrix)
    );
    gl.uniformMatrix4fv(u_viewMatrix, false, new Float32Array(viewMatrix));

    for (const m of models) {
      gl.uniformMatrix4fv(u_modelMatrix, false, new Float32Array(m));
      gl.drawArrays(gl.TRIANGLES, 0, 9);
    }

    gl.bindVertexArray(null);
  };

  const onResize = () => {
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    const w = window.innerWidth * dpr;
    const h = window.innerHeight * dpr;

    canvas.width = w;
    canvas.height = h;

    gl.viewport(0, 0, w, h);
  };

  onResize();

  return { render, onResize };
};
