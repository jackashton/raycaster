import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';
import { Player } from './player';

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
      // Map x & y to range [-1, 1]
      const xo = ((x * mapS) / width) * 2 - 1 + gap;
      const yo = 1 - ((y * mapS) / height) * 2 - gap;

      const vertices = [
        xo,
        yo,
        xo,
        yo - (mapS / height) * 2 + gap,
        xo + (mapS / width) * 2 - gap,
        yo - (64 / height) * 2 + gap,
        xo + (mapS / width) * 2 - gap,
        yo,
      ];

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.uniform4fv(colorLocation, color);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
  }
};

const drawPlayer2D = (gl: WebGL2RenderingContext, program: WebGLProgram, { position, delta, color }: Player) => {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position.toArray()), gl.STATIC_DRAW);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const colorLocation = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLocation, color);

  gl.drawArrays(gl.POINTS, 0, 1);

  // draw player direction line
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([...position.toArray(), ...position.add(delta.multiply(0.1)).toArray()]),
    gl.STATIC_DRAW,
  );
  gl.drawArrays(gl.LINES, 0, 2);
};

const player = new Player(new Vector2D(0.0, 0.0), [1.0, 0.0, 0.0, 1.0]);

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
  const moveDirection = keysPressed[Action.MOVE_LEFT] ? -1 : keysPressed[Action.MOVE_RIGHT] ? 1 : 0;

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
  drawPlayer2D(gl, program, player);
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
