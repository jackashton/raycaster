import { Vector2D } from './utils/vector';

class CollisionManager {
  private map: number[];
  private mapWidth: number;
  private mapHeight: number;
  private tileSize: number;

  constructor(map: number[], mapWidth: number, mapHeight: number, tileSize: number) {
    this.map = map;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileSize = tileSize;
  }

  isColliding(position: Vector2D, delta: Vector2D, offsetSize: number): { xCollision: boolean; yCollision: boolean } {
    const offset = new Vector2D((delta.x < 0 ? -1 : 1) * offsetSize, (delta.y < 0 ? -1 : 1) * offsetSize);

    // Check collision in x-direction
    const xCollision =
      this.map[
        Math.floor(position.y / this.tileSize) * this.mapWidth + Math.floor((position.x + offset.x) / this.tileSize)
      ] ||
      this.map[
        Math.floor(position.y / this.tileSize) * this.mapWidth + Math.floor((position.x - offset.x) / this.tileSize)
      ];

    // Check collision in y-direction
    const yCollision =
      this.map[
        Math.floor((position.y + offset.y) / this.tileSize) * this.mapWidth + Math.floor(position.x / this.tileSize)
      ] ||
      this.map[
        Math.floor((position.y - offset.y) / this.tileSize) * this.mapWidth + Math.floor(position.x / this.tileSize)
      ];

    return { xCollision: !!xCollision, yCollision: !!yCollision };
  }

  handleInteraction(position: Vector2D, delta: Vector2D, offsetSize: number) {
    const offset = new Vector2D(delta.x * offsetSize, delta.y * offsetSize);

    // Check forward collision with x-offset
    const forwardXIndex =
      Math.floor(position.y / this.tileSize) * this.mapWidth + Math.floor((position.x + offset.x) / this.tileSize);
    if (this.map[forwardXIndex] === 4) {
      this.map[forwardXIndex] = 0; // Remove door if interacted with
    }

    // Check forward collision with y-offset
    const forwardYIndex =
      Math.floor((position.y + offset.y) / this.tileSize) * this.mapWidth + Math.floor(position.x / this.tileSize);
    if (this.map[forwardYIndex] === 4) {
      this.map[forwardYIndex] = 0; // Remove door if interacted with
    }
  }
}

export { CollisionManager };
