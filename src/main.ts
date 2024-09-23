import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';
import { toClipSpace } from './utils/toClipSpace';
import { fetchPPMData, parsePPMP6 } from './utils/parsePPM';
import { Player } from './player';

import dark_stone_9 from './assets/textures/dark_stone_9.ppm';
import dark_brick_2 from './assets/textures/dark_brick_2.ppm';
import dark_corrupted_4 from './assets/textures/dark_corrupted_4.ppm';
import toxic_3 from './assets/textures/toxic_3.ppm';
import door_1 from './assets/textures/door_1.ppm';

const textures = await Promise.all(
  [dark_stone_9, dark_brick_2, dark_corrupted_4, door_1, toxic_3].map(async (texture) => {
    const data = await fetchPPMData(texture);
    if (!data) throw new Error(`Failed to parse ${texture}`);
    const { values } = parsePPMP6(data);
    return values;
  }),
);

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

const drawMap2D = (gl: WebGL2RenderingContext, program: WebGLProgram, width: number, height: number) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');

  for (let y = 0; y < mapY; y++) {
    for (let x = 0; x < mapX; x++) {
      let color = [0.0, 0.0, 0.0, 1.0];
      if (mapW[y * mapX + x]) {
        color = [1.0, 1.0, 1.0, 1.0];
      }

      const xo = x * mapS;
      const yo = y * mapS;

      const vertices = [
        ...toClipSpace(width, height, xo + gap, yo + gap),
        ...toClipSpace(width, height, xo + gap, yo + mapS - gap),
        ...toClipSpace(width, height, xo + mapS - gap, yo + mapS - gap),
        ...toClipSpace(width, height, xo + mapS - gap, yo + gap),
      ];

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.uniform4fv(colorLocation, color);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
  }
};

const drawPlayer2D = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  { position, delta, color }: Player,
  width: number,
  height: number,
  showDirection = false,
) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(toClipSpace(width, height, player.position.x, player.position.y)),
    gl.STATIC_DRAW,
  );

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLocation, color);

  gl.drawArrays(gl.POINTS, 0, 1);

  if (showDirection) {
    // draw player direction line
    const end = position.add(delta.multiply(20));
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        ...toClipSpace(width, height, position.x, position.y),
        ...toClipSpace(width, height, end.x, end.y),
      ]),
      gl.STATIC_DRAW,
    );
    gl.drawArrays(gl.LINES, 0, 2);
  }
};

const rayAngleDelta = (2 * Math.PI) / 360;
const fov = 60;

const drawRays2D = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  player: Player,
  width: number,
  height: number,
) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');

  const horizontalHitWallColor = [0.9, 0.0, 0.0, 1.0];
  const verticalHitWallColor = [0.7, 0.0, 0.0, 1.0];

  let rayAngle = player.angle + rayAngleDelta * (fov / 2);
  rayAngle = normalizeAngle(rayAngle);

  const offset = new Vector2D(0, 0);
  const maxDof = 8;

  for (let r = 0; r < fov; r++) {
    let dof = 0;

    // Precompute common trigonometric values
    const tan = Math.tan(rayAngle);
    const aTan = 1 / tan;

    let rayPosition = new Vector2D(player.position.x, player.position.y);
    let distanceHorizontal = Infinity;
    let distanceVertical = Infinity;

    // Horizontal and vertical positions to be reused
    const horizontalRayPosition = new Vector2D(0, 0);
    const verticalRayPosition = new Vector2D(0, 0);
    let horizontalMapTextureIndex = 0;
    let verticalMapTextureIndex = 0;

    // Horizontal line checks
    if (rayAngle < Math.PI) {
      // looking up
      rayPosition.y = Math.floor(player.position.y / mapS) * mapS - 0.0001;
      rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
      offset.y = -mapS;
      offset.x = -offset.y * aTan;
    } else if (rayAngle > Math.PI) {
      // looking down
      rayPosition.y = Math.floor(player.position.y / mapS) * mapS + mapS;
      rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
      offset.y = mapS;
      offset.x = -offset.y * aTan;
    } else {
      // looking straight left or right
      rayPosition.x = player.position.x;
      rayPosition.y = player.position.y;
      dof = maxDof;
    }

    // Perform raycasting for horizontal lines
    while (dof < maxDof) {
      const mx = Math.floor(rayPosition.x / mapS);
      const my = Math.floor(rayPosition.y / mapS);
      const mp = my * mapX + mx;
      // hit
      if (mp < mapX * mapY && mapW[mp] > 0) {
        horizontalRayPosition.x = rayPosition.x;
        horizontalRayPosition.y = rayPosition.y;
        distanceHorizontal = player.position.distance(horizontalRayPosition);
        horizontalMapTextureIndex = mapW[mp] - 1;
        dof = maxDof;
      } else {
        // go to next line
        rayPosition = rayPosition.add(offset);
        dof++;
      }
    }

    dof = 0; // Reset for vertical check

    // Vertical line checks
    if (rayAngle < Math.PI / 2 || rayAngle > (3 * Math.PI) / 2) {
      // looking right
      rayPosition.x = Math.floor(player.position.x / mapS) * mapS + mapS;
      rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
      offset.x = mapS;
      offset.y = -offset.x * tan;
    } else if (rayAngle === Math.PI / 2 || rayAngle === (3 * Math.PI) / 2) {
      // looking straight up or down
      rayPosition.x = player.position.x;
      rayPosition.y = player.position.y;
      dof = maxDof;
    } else {
      // looking left
      rayPosition.x = Math.floor(player.position.x / mapS) * mapS - 0.0001;
      rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
      offset.x = -mapS;
      offset.y = -offset.x * tan;
    }

    // Perform raycasting for vertical lines
    while (dof < maxDof) {
      const mx = Math.floor(rayPosition.x / mapS);
      const my = Math.floor(rayPosition.y / mapS);
      const mp = my * mapX + mx;
      // hit
      if (mp < mapX * mapY && mapW[mp] > 0) {
        verticalRayPosition.x = rayPosition.x;
        verticalRayPosition.y = rayPosition.y;
        distanceVertical = player.position.distance(verticalRayPosition);
        verticalMapTextureIndex = mapW[mp] - 1;
        dof = maxDof;
      } else {
        // go to next line
        rayPosition = rayPosition.add(offset);
        dof++;
      }
    }

    let wallColor = horizontalHitWallColor;
    let distance = 0;
    let shade = 1;

    if (distanceVertical < distanceHorizontal) {
      rayPosition.x = verticalRayPosition.x;
      rayPosition.y = verticalRayPosition.y;
      distanceHorizontal = distanceVertical;
      distance = distanceHorizontal;
      wallColor = verticalHitWallColor;
      horizontalMapTextureIndex = verticalMapTextureIndex;
      shade = 0.5;
    }

    if (distanceHorizontal < distanceVertical) {
      rayPosition.x = horizontalRayPosition.x;
      rayPosition.y = horizontalRayPosition.y;
      distanceVertical = distanceHorizontal;
      distance = distanceVertical;
      wallColor = horizontalHitWallColor;
    }

    gl.uniform4fv(colorLocation, wallColor);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        ...toClipSpace(width, height, player.position.x, player.position.y),
        ...toClipSpace(width, height, rayPosition.x, rayPosition.y),
      ]),
      gl.STATIC_DRAW,
    );
    gl.drawArrays(gl.LINES, 0, 2);

    // draw walls
    // fix fisheye only on horizontal distance
    const rayAngleFixed = Math.cos(normalizeAngle(player.angle - rayAngle));
    if (distance === distanceHorizontal) distance = distance * rayAngleFixed;

    let lineHeight = (mapS * screenHeight) / distance;
    const textureYStep = textureSize / lineHeight;
    let textureYOffset = 0;

    if (lineHeight > screenHeight) {
      textureYOffset = (lineHeight - screenHeight) / 2;
      lineHeight = screenHeight;
    }

    const lineOffset = screenHeight / 2 - (lineHeight >> 1);

    let textureY = textureYOffset * textureYStep;

    let textureX = 0;
    if (shade === 1) {
      // up/down walls
      textureX = (rayPosition.x / 2) % textureSize;
      // flip x coords of texture if ray is going "down", if you don't do this textures will appear flipped on
      // the "south/down" walls of the mapW.
      if (Math.PI < rayAngle) textureX = textureSize - textureX; // may require  - 1
    } else {
      // left/right walls
      textureX = (rayPosition.y / 2) % textureSize;
      // flip x coords of texture if ray is going "left", if you don't do this textures will appear flipped on the "west/left"
      // walls of the mapW
      if (Math.PI / 2 < rayAngle && rayAngle < (3 * Math.PI) / 2) textureX = textureSize - textureX; // may require - 1
    }

    for (let y = 0; y < lineHeight; y++) {
      const pixelIndex = (Math.trunc(textureY) * textureSize + Math.trunc(textureX)) * 3;
      const red = textures[horizontalMapTextureIndex][pixelIndex] / 255;
      const green = textures[horizontalMapTextureIndex][pixelIndex + 1] / 255;
      const blue = textures[horizontalMapTextureIndex][pixelIndex + 2] / 255;
      gl.uniform4fv(colorLocation, [red * shade, green * shade, blue * shade, 1.0]);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          ...toClipSpace(width, height, r * 8 + 530, y + lineOffset),
          ...toClipSpace(width, height, r * 8 + 530, y + lineOffset + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, y + lineOffset + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, y + lineOffset),
        ]),
        gl.STATIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      textureY += textureYStep;
    }

    // draw floors and ceilings
    for (let y = lineOffset + lineHeight; y < screenHeight; y++) {
      // floors
      const dy = y - screenHeight / 2;
      const textureX = player.position.x / 2 + (Math.cos(rayAngle) * 158 * textureSize) / dy / rayAngleFixed;
      const textureY = player.position.y / 2 - (Math.sin(rayAngle) * 158 * textureSize) / dy / rayAngleFixed;
      let mp = mapF[Math.floor(textureY / textureSize) * mapX + Math.floor(textureX / textureSize)] - 1;
      let pixelIndex =
        ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) * 3 +
        mp * 3;
      let red = textures[mp][pixelIndex] / 255;
      let green = textures[mp][pixelIndex + 1] / 255;
      let blue = textures[mp][pixelIndex + 2] / 255;
      gl.uniform4fv(colorLocation, [red, green, blue, 1.0]);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          ...toClipSpace(width, height, r * 8 + 530, y),
          ...toClipSpace(width, height, r * 8 + 530, y + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, y + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, y),
        ]),
        gl.STATIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // ceilings
      mp = mapC[Math.floor(textureY / textureSize) * mapX + Math.floor(textureX / textureSize)] - 1;
      pixelIndex =
        ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) * 3 +
        mp * 3;
      red = textures[mp][pixelIndex] / 255;
      green = textures[mp][pixelIndex + 1] / 255;
      blue = textures[mp][pixelIndex + 2] / 255;
      gl.uniform4fv(colorLocation, [red, green, blue, 1.0]);
      gl.uniform4fv(colorLocation, [red, green, blue, 1]);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          ...toClipSpace(width, height, r * 8 + 530, screenHeight - y),
          ...toClipSpace(width, height, r * 8 + 530, screenHeight - y + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, screenHeight - y + 8),
          ...toClipSpace(width, height, r * 8 + 530 + 8, screenHeight - y),
        ]),
        gl.STATIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    // Move to next ray
    rayAngle = normalizeAngle(rayAngle - rayAngleDelta);
  }
};

const player = new Player(new Vector2D(400, 150), [0.0, 1.0, 1.0, 1.0]);

// key mappings
enum Action {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  STRAFE = 'STRAFE',
  INTERACT = 'INTERACT',
}

// Default key mappings
const defaultKeyMappings: Record<KeyboardEvent['key'], Action> = {
  W: Action.MOVE_UP,
  w: Action.MOVE_UP,
  ArrowUp: Action.MOVE_UP,
  S: Action.MOVE_DOWN,
  s: Action.MOVE_DOWN,
  ArrowDown: Action.MOVE_DOWN,
  A: Action.MOVE_LEFT,
  a: Action.MOVE_LEFT,
  ArrowLeft: Action.MOVE_LEFT,
  D: Action.MOVE_RIGHT,
  d: Action.MOVE_RIGHT,
  ArrowRight: Action.MOVE_RIGHT,
  Shift: Action.STRAFE,
  E: Action.INTERACT,
  e: Action.INTERACT,
};

const keyMappings = { ...defaultKeyMappings };

const keysPressed: Partial<Record<Action, boolean>> = {};

const updatePosition = (player: Player) => {
  const moveDirection = keysPressed[Action.MOVE_RIGHT] ? -1 : keysPressed[Action.MOVE_LEFT] ? 1 : 0;

  let newplayerPosition = player.position;

  if (moveDirection) {
    if (keysPressed[Action.STRAFE]) {
      const strafeAngle = player.angle + (Math.PI / 2) * moveDirection;
      newplayerPosition = player.position.add(
        new Vector2D(Math.cos(strafeAngle), -Math.sin(strafeAngle)).multiply(player.moveSpeed),
      );
    } else {
      player.angle = normalizeAngle(player.angle + moveDirection * player.turnSpeed);
    }
  }
  if (keysPressed[Action.MOVE_UP]) {
    newplayerPosition = player.position.add(player.delta.multiply(player.moveSpeed));
  }
  if (keysPressed[Action.MOVE_DOWN]) {
    newplayerPosition = player.position.subtract(player.delta.multiply(player.moveSpeed));
  }

  let offsetSize = 10;
  const offset = new Vector2D((player.delta.x < 0 ? -1 : 1) * offsetSize, (player.delta.y < 0 ? -1 : 1) * offsetSize);

  // player x collision
  if (
    mapW[Math.floor(player.position.y / mapS) * mapX + Math.floor((newplayerPosition.x + offset.x) / mapS)] ||
    mapW[Math.floor(player.position.y / mapS) * mapX + Math.floor((newplayerPosition.x - offset.x) / mapS)]
  ) {
    // don't move player in the x-axis
    newplayerPosition.x = player.position.x;
  }

  // player y collision
  if (
    mapW[Math.floor((newplayerPosition.y + offset.y) / mapS) * mapX + Math.floor(player.position.x / mapS)] ||
    mapW[Math.floor((newplayerPosition.y - offset.y) / mapS) * mapX + Math.floor(player.position.x / mapS)]
  ) {
    // don't move player in the y-axis
    newplayerPosition.y = player.position.y;
  }

  player.position = newplayerPosition;

  // interaction collision is forward only
  if (keysPressed[Action.INTERACT]) {
    // reuse vars
    offsetSize = 25;
    offset.x = player.delta.x * offsetSize;
    offset.y = player.delta.y * offsetSize;

    // collision detection for forward offset
    // player x collision
    const forwardOffsetXmapWIndex =
      Math.floor(player.position.y / mapS) * mapX + Math.floor((newplayerPosition.x + offset.x) / mapS);
    if (mapW[forwardOffsetXmapWIndex] === 4) {
      // make wall empty if collision and it is a door
      mapW[forwardOffsetXmapWIndex] = 0;
    }

    // player y collision
    const forwardOffsetYmapWIndex =
      Math.floor((newplayerPosition.y + offset.y) / mapS) * mapX + Math.floor(player.position.x / mapS);
    if (mapW[forwardOffsetYmapWIndex] === 4) {
      mapW[forwardOffsetYmapWIndex] = 0;
    }
  }
};

const handleKeyboardEvent = ({ key, shiftKey }: KeyboardEvent, isPressed: boolean) => {
  const action = keyMappings[key];
  if (action) keysPressed[action] = isPressed;
  keysPressed[Action.STRAFE] = shiftKey;
};

window.addEventListener('keydown', (event: KeyboardEvent) => handleKeyboardEvent(event, true));

window.addEventListener('keyup', (event: KeyboardEvent) => handleKeyboardEvent(event, false));

let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let canvas: HTMLCanvasElement;

const display = () => {
  if (!gl) return;
  gl.clearColor(0.3, 0.3, 0.3, 1.0); // background color
  gl.clear(gl.COLOR_BUFFER_BIT);
  updatePosition(player);
  drawMap2D(gl, program, canvas.width, canvas.height);
  drawRays2D(gl, program, player, canvas.width, canvas.height);
  drawPlayer2D(gl, program, player, canvas.width, canvas.height, true);
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
