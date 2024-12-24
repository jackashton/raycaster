import { Player } from './player';
import { Map, MapCollisionManager } from './map';
import { FirstPersonRenderer } from './renderer';
import { Scene } from './types';
import { Vector2D } from './utils/vector';
import parsePPM from './utils/parsePPM';

import tileMap from './assets/textures/tilemap.ppm';
import skybox from './assets/textures/skybox.ppm';

const { values: textures } = parsePPM(tileMap);
const sky = parsePPM(skybox);

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord; // Pass texture coordinates to fragment shader
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0; // Map [-1, 1] to [0, 1]
    gl_PointSize = 8.0;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec4 u_color;

  uniform sampler2D u_texture; // Use the texture
  varying vec2 v_texCoord;     // Pass texture coordinates from vertex shader
  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord); // Sample texture
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
  0, 0, 0, 0, 3, 0, 3, 0,
  0, 0, 0, 0, 3, 3, 3, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];
/* eslint-enable */

const scene = new Scene();
const map = new Map(mapW, mapF, mapC, mapX, mapY, mapS, textures, 32);
const mapCollisionManager = new MapCollisionManager(map);
scene.addObject(map);
scene.addObject(new Player(new Vector2D(400, 150), mapCollisionManager));

let firstPersonRenderer: FirstPersonRenderer;

let gl: WebGL2RenderingContext;

const init = () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
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

  gl.useProgram(webGLProgram);

  // const textureLocation = gl.getUniformLocation(webGLProgram, 'u_texture');
  // gl.uniform1i(textureLocation, 0); // Use texture unit 0


  // Create texture
  const texture = gl.createTexture();
  // gl.activeTexture(gl.TEXTURE0); // Activate texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width / 8, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Create fullscreen quad
  const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  // Set up attributes
  const positionAttributeLocation = gl.getAttribLocation(webGLProgram, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  firstPersonRenderer = new FirstPersonRenderer(gl, webGLProgram, canvas.width / 8, canvas.height, texture, sky);
};

let n = 2;
let prev = 0;
let average = 0;

const gameLoop = (deltaTime: number) => {
  average = (average * (n - 1)) / n + (deltaTime - prev) / n;
  console.log(average);
  prev = deltaTime;
  n++;

  // draw background color
  gl.clearColor(0.3, 0.3, 0.3, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // TODO combine updates with rendering maybe since we need to loop over all objects in the scene
  scene.objects.forEach((obj) => {
    obj.update?.(deltaTime);
  });

  firstPersonRenderer.render(scene);

  // Draw the quad
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(gameLoop);
};

const main = () => {
  init();
  gameLoop(0);
};

main();
