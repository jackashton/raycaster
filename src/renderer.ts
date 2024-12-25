import { Scene } from './types';
import { Player } from './player';
import { Map } from './map';
import { toClipSpace } from './utils/toClipSpace';
import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';

interface Renderer {
  render(scene: Scene): void;
}

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

class TopDownRenderer implements Renderer {
  vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      gl_PointSize = 8.0;
    }
  `;

  fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;

    void main() {
      gl_FragColor = u_color;
    }
  `;

  private positionBuffer: WebGLBuffer | null = null;
  private readonly colorLocation: WebGLUniformLocation | null = null;

  constructor(
    private gl: WebGL2RenderingContext,
    private width: number,
    private height: number,
  ) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const webGLProgram = createProgram(gl, vertexShader, fragmentShader);
    if (!webGLProgram) return;

    gl.useProgram(webGLProgram);

    const positionAttributeLocation = this.gl.getAttribLocation(webGLProgram, 'a_position');
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

    this.colorLocation = this.gl.getUniformLocation(webGLProgram, 'u_color');
  }

  render(scene: Scene): void {
    this.gl.clearColor(0.3, 0.3, 0.3, 1.0); // background color
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    for (const obj of scene.objects) {
      if (obj instanceof Player) {
        this.drawPlayer(obj);
      } else if (obj instanceof Map) {
        this.drawMap(obj);
      }
    }
  }

  private drawPlayer(player: Player): void {
    const color = [0.0, 1.0, 1.0, 1.0];
    const showDirection = true;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(toClipSpace(this.width, this.height, player.position.x, player.position.y)),
      this.gl.STATIC_DRAW,
    );

    this.gl.uniform4fv(this.colorLocation, color);

    this.gl.drawArrays(this.gl.POINTS, 0, 1);

    if (showDirection) {
      // draw player direction line
      const end = player.position.add(player.delta.multiply(20));
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([
          ...toClipSpace(this.width, this.height, player.position.x, player.position.y),
          ...toClipSpace(this.width, this.height, end.x, end.y),
        ]),
        this.gl.STATIC_DRAW,
      );
      this.gl.drawArrays(this.gl.LINES, 0, 2);
    }
  }

  private drawMap(map: Map): void {
    // TODO move constants somewhere more appropriate
    const gap = 1;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    for (let y = 0; y < map.mapY; y++) {
      for (let x = 0; x < map.mapX; x++) {
        let color = [0.0, 0.0, 0.0, 1.0];
        if (map.mapW[y * map.mapX + x]) {
          color = [1.0, 1.0, 1.0, 1.0];
        }

        const xo = x * map.mapS;
        const yo = y * map.mapS;

        const vertices = [
          ...toClipSpace(this.width, this.height, xo + gap, yo + gap),
          ...toClipSpace(this.width, this.height, xo + gap, yo + map.mapS - gap),
          ...toClipSpace(this.width, this.height, xo + map.mapS - gap, yo + map.mapS - gap),
          ...toClipSpace(this.width, this.height, xo + map.mapS - gap, yo + gap),
        ];

        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.gl.uniform4fv(this.colorLocation, color);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
      }
    }
  }
}

class FirstPersonRenderer implements Renderer {
  vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord; // Pass texture coordinates to fragment shader
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = (a_position + 1.0) / 2.0; // Map [-1, 1] to [0, 1]
      gl_PointSize = 8.0;
    }
  `;

  fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;

    uniform sampler2D u_texture; // Use the texture
    varying vec2 v_texCoord;     // Pass texture coordinates from vertex shader
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord); // Sample texture
    }
  `;

  private readonly pixelBuffer: Uint8Array;

  constructor(
    private gl: WebGL2RenderingContext,
    private width: number,
    private height: number,
    private skybox: { width: number; height: number; values: Uint8Array },
  ) {
    this.pixelBuffer = new Uint8Array(this.width * this.height * 4);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const webGLProgram = createProgram(gl, vertexShader, fragmentShader);
    if (!webGLProgram) return;

    gl.useProgram(webGLProgram);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // Create fullscreen quad
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Set up attributes
    const positionAttributeLocation = gl.getAttribLocation(webGLProgram, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  }

  setPixel(x: number, y: number, color: [number, number, number]) {
    const index = (y * this.width + x) * 4;
    this.pixelBuffer[index] = color[0]; // Red
    this.pixelBuffer[index + 1] = color[1]; // Green
    this.pixelBuffer[index + 2] = color[2]; // Blue
    this.pixelBuffer[index + 3] = 255; // Alpha
  }

  drawSkybox(angle: number) {
    const { height: textureHeight, width: textureWidth, values } = this.skybox;

    // Screen dimensions (half the screen height for the skybox)
    const screenHeight = this.height / 2;
    const screenWidth = this.width;

    // Scaling factor to map the texture to the screen
    const scaleY = textureHeight / screenHeight;
    const scaleX = textureWidth / screenWidth;

    for (let y = 0; y < screenHeight; y++) {
      for (let x = 0; x < screenWidth; x++) {
        // Map screen coordinates (x, y) to texture coordinates
        const textureY = Math.floor(y * scaleY);
        let textureX = Math.floor(angle * 2 - (x * scaleX));

        // Handle wrapping in the horizontal direction
        if (textureX < 0) textureX += textureWidth;
        textureX = textureX % textureWidth;

        // Fetch the pixel color from the texture
        const pixelIndex = (textureY * textureWidth + textureX) * 3;
        const red = values[pixelIndex];
        const green = values[pixelIndex + 1];
        const blue = values[pixelIndex + 2];

        // Set the pixel on the screen
        this.setPixel(x, y, [red, green, blue]);
      }
    }
  }

  render(scene: Scene): void {
    // TODO cache these so we don't have to find them in the scene every time
    let map: Map | undefined;
    let player: Player | undefined;
    for (const obj of scene.objects) {
      if (obj instanceof Player) {
        player = obj;
      } else if (obj instanceof Map) {
        map = obj;
      }

      if (player && map) break;
    }

    if (!player || !map) throw new Error('Player or Map is not defined');

    const rayAngleDelta = Math.PI / 360;
    const fov = 120;

    const textureSize = 32;

    const floorTextureCoefficient = 316;

    let rayAngle = player.angle + rayAngleDelta * (fov / 2);
    rayAngle = normalizeAngle(rayAngle);

    const offset = new Vector2D(0, 0);
    const maxDof = 8;

    this.drawSkybox((player.angle * 180) / Math.PI);

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
        rayPosition.y = Math.floor(player.position.y / map.mapS) * map.mapS - 0.0001;
        rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
        offset.y = -map.mapS;
        offset.x = -offset.y * aTan;
      } else if (rayAngle > Math.PI) {
        // looking down
        rayPosition.y = Math.floor(player.position.y / map.mapS) * map.mapS + map.mapS;
        rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
        offset.y = map.mapS;
        offset.x = -offset.y * aTan;
      } else {
        // looking straight left or right
        rayPosition.x = player.position.x;
        rayPosition.y = player.position.y;
        dof = maxDof;
      }

      // Perform raycasting for horizontal lines
      while (dof < maxDof) {
        const mx = Math.floor(rayPosition.x / map.mapS);
        const my = Math.floor(rayPosition.y / map.mapS);
        const mp = my * map.mapX + mx;
        // hit
        if (mp < map.mapX * map.mapY && map.mapW[mp] > 0) {
          horizontalRayPosition.x = rayPosition.x;
          horizontalRayPosition.y = rayPosition.y;
          distanceHorizontal = player.position.distance(horizontalRayPosition);
          horizontalMapTextureIndex = map.mapW[mp] - 1;
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
        rayPosition.x = Math.floor(player.position.x / map.mapS) * map.mapS + map.mapS;
        rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
        offset.x = map.mapS;
        offset.y = -offset.x * tan;
      } else if (rayAngle === Math.PI / 2 || rayAngle === (3 * Math.PI) / 2) {
        // looking straight up or down
        rayPosition.x = player.position.x;
        rayPosition.y = player.position.y;
        dof = maxDof;
      } else {
        // looking left
        rayPosition.x = Math.floor(player.position.x / map.mapS) * map.mapS - 0.0001;
        rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
        offset.x = -map.mapS;
        offset.y = -offset.x * tan;
      }

      // Perform raycasting for vertical lines
      while (dof < maxDof) {
        const mx = Math.floor(rayPosition.x / map.mapS);
        const my = Math.floor(rayPosition.y / map.mapS);
        const mp = my * map.mapX + mx;
        // hit
        if (mp < map.mapX * map.mapY && map.mapW[mp] > 0) {
          verticalRayPosition.x = rayPosition.x;
          verticalRayPosition.y = rayPosition.y;
          distanceVertical = player.position.distance(verticalRayPosition);
          verticalMapTextureIndex = map.mapW[mp] - 1;
          dof = maxDof;
        } else {
          // go to next line
          rayPosition = rayPosition.add(offset);
          dof++;
        }
      }

      let distance = 0;
      let shade = 1;

      if (distanceVertical < distanceHorizontal) {
        rayPosition.x = verticalRayPosition.x;
        rayPosition.y = verticalRayPosition.y;
        distanceHorizontal = distanceVertical;
        distance = distanceHorizontal;
        horizontalMapTextureIndex = verticalMapTextureIndex;
        shade = 0.5;
      }

      if (distanceHorizontal < distanceVertical) {
        rayPosition.x = horizontalRayPosition.x;
        rayPosition.y = horizontalRayPosition.y;
        distanceVertical = distanceHorizontal;
        distance = distanceVertical;
      }

      // draw walls
      // fix fisheye only on horizontal distance
      const rayAngleFixed = Math.cos(normalizeAngle(player.angle - rayAngle));
      if (distance === distanceHorizontal) distance = distance * rayAngleFixed;

      let lineHeight = (map.mapS * this.height) / distance;
      const textureYStep = textureSize / lineHeight;
      let textureYOffset = 0;

      if (lineHeight > this.height) {
        textureYOffset = (lineHeight - this.height) / 2;
        lineHeight = this.height;
      }

      const lineOffset = this.height / 2 - (lineHeight >> 1);

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
        const pixelIndex =
          (Math.trunc(textureY) * textureSize + Math.trunc(textureX)) * 3 +
          horizontalMapTextureIndex * textureSize * textureSize * 3;
        const red = map.textures[pixelIndex];
        const green = map.textures[pixelIndex + 1];
        const blue = map.textures[pixelIndex + 2];

        this.setPixel(Math.floor(r), y + lineOffset, [red, green, blue]);

        textureY += textureYStep;
      }

      // draw floors and ceilings
      for (let y = lineOffset + lineHeight; y < this.height; y++) {
        // floors
        const dy = y - this.height / 2;
        const textureX =
          player.position.x / 2 + (Math.cos(rayAngle) * floorTextureCoefficient * textureSize) / dy / rayAngleFixed;
        const textureY =
          player.position.y / 2 - (Math.sin(rayAngle) * floorTextureCoefficient * textureSize) / dy / rayAngleFixed;
        let mp = map.mapF[Math.floor(textureY / textureSize) * map.mapX + Math.floor(textureX / textureSize)] - 1;
        let pixelIndex =
          ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) * 3 +
          mp * 3 * textureSize * textureSize;

        let red = map.textures[pixelIndex];
        let green = map.textures[pixelIndex + 1];
        let blue = map.textures[pixelIndex + 2];

        this.setPixel(Math.floor(r), Math.floor(y), [red, green, blue]);

        // ceilings
        mp = map.mapC[Math.floor(textureY / textureSize) * map.mapX + Math.floor(textureX / textureSize)] - 1;

        if (mp > 0) {
          pixelIndex =
            ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) *
              3 +
            mp * 3 * textureSize * textureSize;

          red = map.textures[pixelIndex];
          green = map.textures[pixelIndex + 1];
          blue = map.textures[pixelIndex + 2];

          this.setPixel(Math.floor(r), Math.floor(this.height - y), [red, green, blue]);
        }
      }

      // Move to next ray
      rayAngle = normalizeAngle(rayAngle - rayAngleDelta);
    }

    // Upload pixel data to texture
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      this.width,
      this.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.pixelBuffer,
    );

    // Draw the quad
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

export { TopDownRenderer, FirstPersonRenderer };
