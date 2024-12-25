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
// let topdownRenderer: TopDownRenderer;

const init = () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl2');

  if (!gl) {
    console.error('Unable to initialize WebGL');
    return;
  }

  firstPersonRenderer = new FirstPersonRenderer(gl, canvas.width / 8, canvas.height, sky);
  // topdownRenderer = new TopDownRenderer(gl, canvas.width, canvas.height);
};

const gameLoop = (deltaTime: number) => {
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
