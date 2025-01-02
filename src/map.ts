import { PPMImage } from 'ppm-parser';
import { GameObject } from './types';
import { Vector2D } from './utils/vector';

export class Map implements GameObject {
  constructor(
    public mapW: number[],
    public mapF: number[],
    public mapC: number[],
    public mapX: number,
    public mapY: number,
    public mapS: number,
    public textures: PPMImage,
    public tileSize: number,
  ) {}

  update() {}
}

export class MapCollisionManager {
  public map: Map;

  constructor(map: Map) {
    this.map = map;
  }

  checkCollision(position: Vector2D, delta: Vector2D, offsetSize: number) {
    const offset = new Vector2D((delta.x < 0 ? -1 : 1) * offsetSize, (delta.y < 0 ? -1 : 1) * offsetSize);

    let xCollisionPoint: Vector2D | null = null;
    let yCollisionPoint: Vector2D | null = null;

    // Check collision in x-direction
    const xForwardTileIndex =
      Math.floor(position.y / this.map.mapS) * this.map.mapX + Math.floor((position.x + offset.x) / this.map.mapS);
    const xBackwardTileIndex =
      Math.floor(position.y / this.map.mapS) * this.map.mapX + Math.floor((position.x - offset.x) / this.map.mapS);

    const xForwardTile =
      0 < xForwardTileIndex && xForwardTileIndex < this.map.mapW.length - 1 ? this.map.mapW[xForwardTileIndex] : 0;
    const xBackwardTile =
      0 < xBackwardTileIndex && xBackwardTileIndex < this.map.mapW.length - 1 ? this.map.mapW[xBackwardTileIndex] : 0;

    const xCollision = !!(xForwardTile || xBackwardTile);

    // Find exact collision point for x-direction
    if (xCollision) {
      const collisionX =
        delta.x > 0
          ? Math.ceil(position.x / this.map.tileSize) * this.map.tileSize
          : Math.floor(position.x / this.map.tileSize) * this.map.tileSize;

      xCollisionPoint = new Vector2D(collisionX, position.y + delta.y);
    }

    // Check collision in y-direction
    const yForwardTileIndex =
      Math.floor((position.y + offset.y) / this.map.mapS) * this.map.mapX + Math.floor(position.x / this.map.mapS);
    const yBackwardTileIndex =
      Math.floor((position.y - offset.y) / this.map.mapS) * this.map.mapX + Math.floor(position.x / this.map.mapS);

    const yForwardTile =
      0 < yForwardTileIndex && yForwardTileIndex < this.map.mapW.length - 1 ? this.map.mapW[yForwardTileIndex] : 0;
    const yBackwardTile =
      0 < yBackwardTileIndex && yBackwardTileIndex < this.map.mapW.length - 1 ? this.map.mapW[yBackwardTileIndex] : 0;

    const yCollision = !!(yForwardTile || yBackwardTile);

    // Find exact collision point for y-direction
    if (yCollision) {
      const collisionY =
        delta.y > 0
          ? Math.ceil(position.y / this.map.tileSize) * this.map.tileSize
          : Math.floor(position.y / this.map.tileSize) * this.map.tileSize;

      yCollisionPoint = new Vector2D(position.x + delta.x, collisionY);
    }

    return {
      xCollision: xCollision
        ? {
            forwardTileIndex: xForwardTileIndex,
            forwardTile: xForwardTile,
            backwardTileIndex: xBackwardTileIndex,
            backwardTile: xBackwardTile,
            collisionPoint: xCollisionPoint,
          }
        : null,
      yCollision: yCollision
        ? {
            forwardTileIndex: yForwardTileIndex,
            forwardTile: yForwardTile,
            backwardTileIndex: yBackwardTileIndex,
            backwardTile: yBackwardTile,
            collisionPoint: yCollisionPoint,
          }
        : null,
    };
  }
}
