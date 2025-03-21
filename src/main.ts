import { Player } from './player';
import { Sprite } from './sprite';
import { Map, MapCollisionManager } from './map';
import { FirstPersonRenderer } from './renderer';
import { Scene } from './types';
import { Vector2D } from './utils/vector';

import textures from './assets/textures/tilemap.ppm';
import skybox from './assets/textures/skybox.ppm';

const mapX = 8;
const mapY = 8;
const mapS = 64;

/* eslint-disable */
const mapW = [
  2, 2, 2, 2, 2, 2, 2, 2,
  2, 0, 0, 2, 0, 0, 0, 2,
  2, 0, 0, 8, 0, 0, 0, 2,
  2, 2, 8, 2, 0, 0, 0, 2,
  2, 0, 0, 0, 0, 2, 0, 2,
  2, 0, 0, 0, 0, 0, 0, 2,
  2, 0, 0, 0, 0, 0, 0, 2,
  2, 2, 2, 2, 2, 2, 2, 2,
];
/* eslint-enable */

/* eslint-disable */
const mapF = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 4, 4, 0, 1, 1, 1, 0,
  0, 4, 4, 1, 1, 1, 1, 0,
  0, 0, 1, 0, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 0, 1, 0,
  0, 1, 1, 1, 1, 1, 4, 0,
  0, 1, 1, 1, 1, 4, 4, 0,
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

const animatedTexturesW = {
  8: { frames: [9, 10, 11, 12, 13, 14, 15, 16, 17, 0], duration: 150, currentFrame: 0, lastTime: 0 },
};

const scene = new Scene();
const map = new Map(mapW, mapF, mapC, mapX, mapY, mapS, animatedTexturesW, textures, 32);
const mapCollisionManager = new MapCollisionManager(map);
scene.addObject(map);
scene.addObject(new Player(new Vector2D(400, 150), mapCollisionManager));
scene.addObject(new Sprite(new Vector2D(96, 320), 20 * 8, 6));

let firstPersonRenderer: FirstPersonRenderer;
// let topdownRenderer: TopDownRenderer;

const init = () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl2');

  if (!gl) {
    console.error('Unable to initialize WebGL');
    return;
  }

  firstPersonRenderer = new FirstPersonRenderer(gl, canvas.width / 8, canvas.height, skybox);
  // topdownRenderer = new TopDownRenderer(gl, canvas.width, canvas.height);
};

let frameCount = 0;
let fps = 0;
let fpsUpdateTime = performance.now(); // When to update displayed fps

const fpsElem = document.querySelector('#fps');

const gameLoop = (deltaTime: number) => {
  const now = performance.now();

  frameCount++;

  // Update FPS every second
  if (now - fpsUpdateTime > 1000 && fpsElem) {
    fps = frameCount / ((now - fpsUpdateTime) / 1000);
    fpsUpdateTime = now;
    frameCount = 0;

    fpsElem.textContent = fps.toFixed(2);
  }

  // TODO combine updates with rendering maybe since we need to loop over all objects in the scene
  scene.objects.forEach((obj) => {
    obj.update?.(deltaTime);
  });

  firstPersonRenderer.render(scene);
  // topdownRenderer.render(scene);

  requestAnimationFrame(gameLoop);
};

const main = () => {
  init();
  gameLoop(0);
};

main();
