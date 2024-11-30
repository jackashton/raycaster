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
    public textures: Uint8Array[],
  ) {}

  isColliding(position: Vector2D): boolean {
    const tileX = Math.floor(position.x / this.mapS);
    const tileY = Math.floor(position.y / this.mapS);
    const tileIndex = tileY * this.mapX + tileX;
    return this.mapW[tileIndex] !== 0;
  }
}
