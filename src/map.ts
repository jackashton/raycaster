import { Component } from './types';
import { RenderContext } from './renderContext';
import { Player } from './player';
import normalizeAngle from './utils/normalizeAngle';
import { Vector2D } from './utils/vector';
import { toClipSpace } from './utils/toClipSpace';

export class Map implements Component {
  constructor(
    public mapW: number[],
    public mapF: number[],
    public mapC: number[],
    public mapX: number,
    public mapY: number,
    public mapS: number,
  ) {}

  update(deltaTime: number) {
    // Map-specific logic (e.g., animating tiles, if needed)
  }

  render(context: RenderContext, player?: Player) {
    const { gl, program, width, height } = context;
    this.render2D(gl, program, width, height);
    if (!player) return;
    this.render3D(gl, program, player, width, height);
  }

  // Basic 2D render logic for the map (top-down view)
  private render2D(gl: WebGL2RenderingContext, program: WebGLProgram, width: number, height: number) {
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
  }

  // Perform raycasting or projection from the player's perspective
  private render3D(gl: WebGL2RenderingContext, program: WebGLProgram, player: Player, width: number, height: number) {
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
  }

  isColliding(position: Vector2D): boolean {
    const tileX = Math.floor(position.x / this.mapScale);
    const tileY = Math.floor(position.y / this.mapScale);
    const tileIndex = tileY * this.mapWidth + tileX;
    return this.mapData[tileIndex] !== 0;
  }
}
