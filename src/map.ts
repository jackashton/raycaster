import { GameObject, MapCollisionManager, Collidable } from './types';

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
}

export class MapCollisionManagerImpl implements MapCollisionManager {
  private map: Map;

  constructor(map: Map) {
    this.map = map;
  }

  checkCollision(obj: Collidable): boolean {
    const bounds = obj.getBounds();

    // TODO handle bounds size
    const tileX = Math.floor(bounds.x / this.map.mapS);
    const tileY = Math.floor(bounds.y / this.map.mapS);
    const tileIndex = tileY * this.map.mapX + tileX;
    return this.map.mapW[tileIndex] !== 0;
  }
}
