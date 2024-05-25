const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = 8.0;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
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

const mapX = 8;
const mapY = 8;
const mapS = 64;
const gap = 0.1 / mapS;
const map = [
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
];

const drawMap2D = (gl: WebGL2RenderingContext, program: WebGLProgram, width: number, height: number) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLocation, [0.0, 0.0, 0.0, 1]);

  for (let y = 0; y < mapY; y++) {
    for (let x = 0; x < mapX; x++) {
      if (map[y * mapX + x]) {
        // Map x & y to range [-1, 1]
        const xo = ((x * mapS) / width) * 2 - 1 + gap;
        const yo = 1 - ((y * mapS) / height) * 2 - gap;

        const vertices = [
          xo, yo,
          xo, yo - (mapS / height) * 2 + gap,
          xo + (mapS / width) * 2 - gap, yo - (64 / height) * 2 + gap,
          xo + (mapS / width) * 2 - gap, yo,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      }
    }
  }
};

const drawPlayer2D = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  position: [number, number],
  color: [number, number, number, number],
) => {
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

const playerPosition: [number, number] = [0.0, 0.0];
const playerColor: [number, number, number, number] = [1.0, 0.0, 0.0, 1.0]; // Red
const moveSpeed = 0.01;

// key mappings
enum Action {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
}

// Default key mappings
const defaultKeyMappings: Record<KeyboardEvent['key'], Action> = {
  w: Action.MOVE_UP,
  ArrowUp: Action.MOVE_UP,
  s: Action.MOVE_DOWN,
  ArrowDown: Action.MOVE_DOWN,
  a: Action.MOVE_LEFT,
  ArrowLeft: Action.MOVE_LEFT,
  d: Action.MOVE_RIGHT,
  ArrowRight: Action.MOVE_RIGHT,
};

const keyMappings = { ...defaultKeyMappings };

const keysPressed: Partial<Record<Action, boolean>> = {};

const updatePosition = () => {
  if (keysPressed[Action.MOVE_UP]) playerPosition[1] += moveSpeed;
  if (keysPressed[Action.MOVE_DOWN]) playerPosition[1] -= moveSpeed;
  if (keysPressed[Action.MOVE_LEFT]) playerPosition[0] -= moveSpeed;
  if (keysPressed[Action.MOVE_RIGHT]) playerPosition[0] += moveSpeed;
};

window.addEventListener('keydown', ({ key }: KeyboardEvent) => {
  const action = keyMappings[key];
  if (action) keysPressed[action] = true;
});

window.addEventListener('keyup', ({ key }: KeyboardEvent) => {
  const action = keyMappings[key];
  if (action) keysPressed[action] = false;
});

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let canvas: HTMLCanvasElement;

const display = () => {
  if (!gl) return;
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // Clear to white color
  gl.clear(gl.COLOR_BUFFER_BIT);
  updatePosition();
  drawMap2D(gl, program, canvas.width, canvas.height);
  drawPlayer2D(gl, program, playerPosition, playerColor);
  requestAnimationFrame(display);
};

const init = () => {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const webGL2RenderingContext = canvas.getContext('webgl2');

  if (!webGL2RenderingContext) {
    console.error('Unable to initialize WebGL');
    return;
  }

  gl = webGL2RenderingContext;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) return;

  const webGLProgram = createProgram(gl, vertexShader, fragmentShader);
  if (!webGLProgram) return;
  program = webGLProgram;

  gl.useProgram(program);
};

const main = () => {
  init();
  display();
};

main();
