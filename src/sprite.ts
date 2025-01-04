import { GameObject } from './types';
import { Vector2D } from './utils/vector';

// Could include zIndex as z in a Vector3D but imo z here is used for draw order opposed to 3d position
export class Sprite implements GameObject {
  constructor(
    public position: Vector2D,
    public z: number,
    public type: number,
  ) {}

  update() {}
}
