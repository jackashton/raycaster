export interface GameObject {
  update?: (deltatTime: number) => void;
}

export class Scene {
  objects: GameObject[] = [];

  addObject(obj: GameObject): void {
    this.objects.push(obj);
  }
}

// collisions
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;

  /**
   * Check if this bounding box intersects with another bounding box.
   */
  intersects(other: BoundingBox): boolean;
}

export interface Collidable {
  /**
   * Get the bounding box or collision shape of the object.
   * Can be extended for advanced shapes (e.g., circles, polygons).
   */
  getBounds(): BoundingBox;

  /**
   * Called when this object collides with another object.
   */
  onCollision(other: Collidable): void;
}

export interface MapCollisionManager {
  /**
   * Checks if a game object is colliding with the map.
   * @param obj The game object to check.
   * @returns True if there is a collision, false otherwise.
   */
  checkCollision(obj: Collidable): boolean;
}
