const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = 10.0;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // red
  }
`;

const createShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
};

const drawDot = (gl: WebGL2RenderingContext, program: WebGLProgram, position: [number, number], color: [number, number, number, number]) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLocation, color);

  gl.drawArrays(gl.POINTS, 0, 1);
};

const init = () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl2');

  if (!gl) {
    console.error('Unable to initialize WebGL');
    return;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) return;

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return;
  gl.useProgram(program);

  // game code
  const dotPosition: [number, number] = [0.0, 0.0];
  const dotColor: [number, number, number, number] = [1.0, 0.0, 0.0, 1.0]; // Red dot
  const moveSpeed = 0.01;
  const keysPressed = { w: false, s: false, a: false, d: false };

  const updatePosition = () => {
    if (keysPressed.w) dotPosition[1] += moveSpeed;
    if (keysPressed.s) dotPosition[1] -= moveSpeed;
    if (keysPressed.a) dotPosition[0] -= moveSpeed;
    if (keysPressed.d) dotPosition[0] += moveSpeed;
  };

  const drawScene = () => {
    gl.clearColor(1.0, 1.0, 1.0, 1.0); // Clear to white color
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawDot(gl, program, dotPosition, dotColor); // Drawing the dot
  };

  const main = () => {
    updatePosition();
    drawScene();
    requestAnimationFrame(main);
  };

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key in keysPressed) {
      keysPressed[event.key as keyof typeof keysPressed] = true;
    }
  });

  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.key in keysPressed) {
      keysPressed[event.key as keyof typeof keysPressed] = false;
    }
  });

  main();
};

init();
