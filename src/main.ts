import { RenderContext } from './renderContext';
import { Player } from './player';
import { Map } from './map';
import { Vector2D } from './utils/vector';
import { toClipSpace } from './utils/toClipSpace';
import parsePPM from './utils/parsePPM';

import dark_stone_9 from './assets/textures/dark_stone_9.ppm';
import dark_brick_2 from './assets/textures/dark_brick_2.ppm';
import dark_corrupted_4 from './assets/textures/dark_corrupted_4.ppm';
import toxic_3 from './assets/textures/toxic_3.ppm';
import door_1 from './assets/textures/door_1.ppm';

const textures = [dark_stone_9, dark_brick_2, dark_corrupted_4, door_1, toxic_3].map((texture) => {
  const { values } = parsePPM(texture);
  return values;
});

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

const screenHeight = 320;
const mapX = 8;
const mapY = 8;
const mapS = 64;
const gap = 1;

/* eslint-disable */
const mapW = [
  2, 2, 2, 2, 2, 2, 2, 2,
  2, 0, 0, 2, 0, 0, 0, 2,
  2, 0, 0, 4, 0, 0, 0, 2,
  2, 2, 4, 2, 0, 0, 0, 2,
  2, 0, 0, 0, 0, 2, 0, 2,
  2, 0, 0, 0, 0, 0, 0, 2,
  2, 0, 0, 0, 0, 0, 0, 2,
  2, 2, 2, 2, 2, 2, 2, 2,
];
/* eslint-enable */

/* eslint-disable */
const mapF = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 5, 5, 0, 1, 1, 1, 0,
  0, 5, 5, 1, 1, 1, 1, 0,
  0, 0, 1, 0, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 0, 1, 0,
  0, 1, 1, 1, 1, 1, 5, 0,
  0, 1, 1, 1, 1, 5, 5, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];
/* eslint-enable */

/* eslint-disable */
const mapC = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 3, 3, 0, 3, 3, 3, 0,
  0, 3, 3, 3, 3, 3, 3, 0,
  0, 0, 3, 0, 3, 3, 3, 0,
  0, 3, 3, 3, 3, 0, 3, 0,
  0, 3, 3, 3, 3, 3, 3, 0,
  0, 3, 3, 3, 3, 3, 3, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];
/* eslint-enable */

const textureSize = 32;

const rayAngleDelta = (2 * Math.PI) / 360;
const fov = 60;

const player = new Player(new Vector2D(400, 150), [0.0, 1.0, 1.0, 1.0]);
const map = new Map(mapW, mapF, mapC, mapX, mapY, mapS);
// const collisionManager = new CollisionManager(mapW, mapX, mapY, mapS);

const components = [player, map];

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let canvas: HTMLCanvasElement;

let renderContext: RenderContext;

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

  renderContext = new RenderContext(gl, program, canvas.width, canvas.height);
};

const display = (deltaTime: number) => {
  if (!renderContext) return;
  gl.clearColor(0.3, 0.3, 0.3, 1.0); // background color
  gl.clear(gl.COLOR_BUFFER_BIT);
  components.forEach((component) => {
    component.update(deltaTime);
    component.render(renderContext, player);
  });
  requestAnimationFrame(display);
};

const main = () => {
  init();
  display(0);
};

main();
