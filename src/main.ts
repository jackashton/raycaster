import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';
import { Player } from './player';
import { canvasToClipSpace } from './utils/toClipSpace';

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
const gap = 1;
const map = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

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
      if (map[y * mapX + x]) {
        color = [1.0, 1.0, 1.0, 1.0];
      }

      const xo = x * mapS;
      const yo = y * mapS;

      const vertices = [
        ...canvasToClipSpace(width, height, xo + gap, yo + gap),
        ...canvasToClipSpace(width, height, xo + gap, yo + mapS - gap),
        ...canvasToClipSpace(width, height, xo + mapS - gap, yo + mapS - gap),
        ...canvasToClipSpace(width, height, xo + mapS - gap, yo + gap),
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
  { color }: Player,
  width: number,
  height: number,
) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(canvasToClipSpace(width, height, player.position.x, player.position.y)),
    gl.STATIC_DRAW,
  );

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLocation, color);

  gl.drawArrays(gl.POINTS, 0, 1);
};

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

  const rayAngle = player.angle;
  const offset = new Vector2D(0, 0);
  const maxDof = 8;

  let rayPosition = new Vector2D(0, 0);
  for (let r = 0; r < 1; r++) {
    let dof = 0;
    // horizontal lines
    let distanceHorizontal = Infinity;
    const horizontalRayPosition = new Vector2D(0, 0);
    const aTan = 1 / Math.tan(rayAngle);

    if (rayAngle < Math.PI) {
      // looking up
      rayPosition.y = Math.floor(player.position.y / mapS) * mapS - 0.0001;
      rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
      offset.y = -mapS;
      offset.x = -offset.y * aTan;
    }
    if (rayAngle > Math.PI) {
      // looking down
      rayPosition.y = Math.floor(player.position.y / mapS) * mapS + mapS;
      rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
      offset.y = mapS;
      offset.x = -offset.y * aTan;
    }
    if (rayAngle === 0 || rayAngle === Math.PI) {
      // looking straight left or right
      rayPosition.x = player.position.x;
      rayPosition.y = player.position.y;
      dof = maxDof;
    }

    while (dof < maxDof) {
      const mx = Math.floor(rayPosition.x / mapS);
      const my = Math.floor(rayPosition.y / mapS);
      const mp = my * mapX + mx;
      // hit
      if (mp < mapX * mapY && map[mp] === 1) {
        horizontalRayPosition.x = rayPosition.x;
        horizontalRayPosition.y = rayPosition.y;
        distanceHorizontal = player.position.distance(horizontalRayPosition);
        dof = maxDof;
      } else {
        // go to next line
        rayPosition = rayPosition.add(offset);
        dof++;
      }
    }

    dof = 0;

    // vertical lines
    let distanceVertical = Infinity;
    const verticalRayPosition = new Vector2D(0, 0);
    const tan = Math.tan(rayAngle);

    if (Math.PI / 2 < rayAngle && rayAngle < (3 * Math.PI) / 2) {
      // looking left
      rayPosition.x = Math.floor(player.position.x / mapS) * mapS - 0.0001;
      rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
      offset.x = -mapS;
      offset.y = -offset.x * tan;
    }
    if ((3 * Math.PI) / 2 < rayAngle || rayAngle < Math.PI / 2) {
      // looking right
      rayPosition.x = Math.floor(player.position.x / mapS) * mapS + mapS;
      rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
      offset.x = mapS;
      offset.y = -offset.x * tan;
    }
    if (rayAngle === Math.PI / 2 || rayAngle === (3 * Math.PI) / 2) {
      // looking straight up or down
      rayPosition.x = player.position.x;
      rayPosition.y = player.position.y;
      dof = maxDof;
    }

    while (dof < maxDof) {
      const mx = Math.floor(rayPosition.x / mapS);
      const my = Math.floor(rayPosition.y / mapS);
      const mp = my * mapX + mx;
      // hit
      if (mp < mapX * mapY && map[mp] === 1) {
        verticalRayPosition.x = rayPosition.x;
        verticalRayPosition.y = rayPosition.y;
        distanceVertical = player.position.distance(verticalRayPosition);
        dof = maxDof;
      } else {
        // go to next line
        rayPosition = rayPosition.add(offset);
        dof++;
      }
    }

    if (distanceVertical < distanceHorizontal) {
      rayPosition.x = verticalRayPosition.x;
      rayPosition.y = verticalRayPosition.y;
      distanceHorizontal = distanceVertical;
    }

    if (distanceHorizontal < distanceVertical) {
      rayPosition.x = horizontalRayPosition.x;
      rayPosition.y = horizontalRayPosition.y;
      distanceVertical = distanceHorizontal;
    }

    gl.uniform4fv(colorLocation, [1.0, 0.0, 0.0, 1.0]);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        ...canvasToClipSpace(width, height, player.position.x, player.position.y),
        ...canvasToClipSpace(width, height, rayPosition.x, rayPosition.y),
      ]),
      gl.STATIC_DRAW,
    );
    gl.drawArrays(gl.LINES, 0, 2);
  }
};

const player = new Player(new Vector2D(400, 150), [1.0, 0.0, 0.0, 1.0]);

// key mappings
enum Action {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  STRAFE = 'STRAFE',
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
};

const keyMappings = { ...defaultKeyMappings };

const keysPressed: Partial<Record<Action, boolean>> = {};

const updatePosition = (player: Player) => {
  const moveDirection = keysPressed[Action.MOVE_RIGHT] ? -1 : keysPressed[Action.MOVE_LEFT] ? 1 : 0;

  if (moveDirection) {
    if (keysPressed[Action.STRAFE]) {
      const strafeAngle = player.angle + (Math.PI / 2) * moveDirection;
      player.position = player.position.add(
        new Vector2D(Math.cos(strafeAngle), -Math.sin(strafeAngle)).multiply(player.moveSpeed),
      );
    } else {
      player.angle = normalizeAngle(player.angle + moveDirection * player.turnSpeed);
      player.updateDelta();
    }
  }
  if (keysPressed[Action.MOVE_UP]) {
    player.position = player.position.add(player.delta.multiply(player.moveSpeed));
  }
  if (keysPressed[Action.MOVE_DOWN]) {
    player.position = player.position.subtract(player.delta.multiply(player.moveSpeed));
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
  drawPlayer2D(gl, program, player, canvas.width, canvas.height);
  drawRays2D(gl, program, player, canvas.width, canvas.height);
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
