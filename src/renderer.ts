import { Scene } from './types';
import { Player } from './player';
import { Map } from './map';
import { toClipSpace } from './utils/toClipSpace';
import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';

interface Renderer {
  render(scene: Scene): void;
}

class TopDownRenderer implements Renderer {
  constructor(
    public gl: WebGL2RenderingContext,
    public program: WebGLProgram,
    public width: number,
    public height: number,
    public screenHeight: number,
  ) {}

  render(scene: Scene): void {
    for (const obj of scene.objects) {
      if (obj instanceof Player) {
        this.drawPlayer(obj);
      } else if (obj instanceof Map) {
        this.drawMap(obj);
      }
    }
  }

  private drawPlayer(player: Player): void {
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(toClipSpace(this.width, this.height, player.position.x, player.position.y)),
      this.gl.STATIC_DRAW,
    );

    const positionAttributeLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

    const colorLocation = this.gl.getUniformLocation(this.program, 'u_color');
    this.gl.uniform4fv(colorLocation, color);

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

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    const positionAttributeLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionAttributeLocation);
    this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);

    const colorLocation = this.gl.getUniformLocation(this.program, 'u_color');

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
        this.gl.uniform4fv(colorLocation, color);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
      }
    }
  }
}

class FirstPersonRenderer implements Renderer {
  constructor(
    private gl: WebGL2RenderingContext,
    private program: WebGLProgram,
    private width: number,
    private height: number,
    private screenHeight: number,
  ) {}

  render(scene: Scene): void {
    // TODO cache these so we don't have to find them in the scene every time
    let map: Map;
    let player: Player;
    for (const obj of scene.objects) {
      if (obj instanceof Player) {
        player = obj;
      } else if (obj instanceof Map) {
        map = obj;
      }
      if (player && map) break;
    }

    const rayAngleDelta = (2 * Math.PI) / 360;
    const fov = 60;

    const textureSize = 32;

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
        rayPosition.y = Math.floor(player.position.y / this.mapS) * this.mapS - 0.0001;
        rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
        offset.y = -this.mapS;
        offset.x = -offset.y * aTan;
      } else if (rayAngle > Math.PI) {
        // looking down
        rayPosition.y = Math.floor(player.position.y / this.mapS) * this.mapS + this.mapS;
        rayPosition.x = (player.position.y - rayPosition.y) * aTan + player.position.x;
        offset.y = this.mapS;
        offset.x = -offset.y * aTan;
      } else {
        // looking straight left or right
        rayPosition.x = player.position.x;
        rayPosition.y = player.position.y;
        dof = maxDof;
      }

      // Perform raycasting for horizontal lines
      while (dof < maxDof) {
        const mx = Math.floor(rayPosition.x / this.mapS);
        const my = Math.floor(rayPosition.y / this.mapS);
        const mp = my * this.mapX + mx;
        // hit
        if (mp < this.mapX * this.mapY && this.mapW[mp] > 0) {
          horizontalRayPosition.x = rayPosition.x;
          horizontalRayPosition.y = rayPosition.y;
          distanceHorizontal = player.position.distance(horizontalRayPosition);
          horizontalMapTextureIndex = this.mapW[mp] - 1;
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
        rayPosition.x = Math.floor(player.position.x / this.mapS) * this.mapS + this.mapS;
        rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
        offset.x = this.mapS;
        offset.y = -offset.x * tan;
      } else if (rayAngle === Math.PI / 2 || rayAngle === (3 * Math.PI) / 2) {
        // looking straight up or down
        rayPosition.x = player.position.x;
        rayPosition.y = player.position.y;
        dof = maxDof;
      } else {
        // looking left
        rayPosition.x = Math.floor(player.position.x / this.mapS) * this.mapS - 0.0001;
        rayPosition.y = (player.position.x - rayPosition.x) * tan + player.position.y;
        offset.x = -this.mapS;
        offset.y = -offset.x * tan;
      }

      // Perform raycasting for vertical lines
      while (dof < maxDof) {
        const mx = Math.floor(rayPosition.x / this.mapS);
        const my = Math.floor(rayPosition.y / this.mapS);
        const mp = my * this.mapX + mx;
        // hit
        if (mp < this.mapX * this.mapY && this.mapW[mp] > 0) {
          verticalRayPosition.x = rayPosition.x;
          verticalRayPosition.y = rayPosition.y;
          distanceVertical = player.position.distance(verticalRayPosition);
          verticalMapTextureIndex = this.mapW[mp] - 1;
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

      let lineHeight = (this.mapS * screenHeight) / distance;
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
        const red = this.textures[horizontalMapTextureIndex][pixelIndex] / 255;
        const green = this.textures[horizontalMapTextureIndex][pixelIndex + 1] / 255;
        const blue = this.textures[horizontalMapTextureIndex][pixelIndex + 2] / 255;
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
        let mp = this.mapF[Math.floor(textureY / textureSize) * this.mapX + Math.floor(textureX / textureSize)] - 1;
        let pixelIndex =
          ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) * 3 +
          mp * 3;
        let red = this.textures[mp][pixelIndex] / 255;
        let green = this.textures[mp][pixelIndex + 1] / 255;
        let blue = this.textures[mp][pixelIndex + 2] / 255;
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
        mp = this.mapC[Math.floor(textureY / textureSize) * this.mapX + Math.floor(textureX / textureSize)] - 1;
        pixelIndex =
          ((Math.floor(textureY) & (textureSize - 1)) * textureSize + (Math.floor(textureX) & (textureSize - 1))) * 3 +
          mp * 3;
        red = this.textures[mp][pixelIndex] / 255;
        green = this.textures[mp][pixelIndex + 1] / 255;
        blue = this.textures[mp][pixelIndex + 2] / 255;
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
  }
}

export { TopDownRenderer, FirstPersonRenderer };
