import { Vector2D } from './utils/vector';

export class Player {
  position: Vector2D;
  color: [number, number, number, number];
  private _angle: number;
  delta: Vector2D;
  moveSpeed: number;
  turnSpeed: number;

  constructor(position: Vector2D, color: [number, number, number, number]) {
    this.position = position;
    this.color = color;
    this._angle = Math.PI / 2;
    this.delta = this.updateDelta();
    this.moveSpeed = 5;
    this.turnSpeed = Math.PI / 64;
  }

  get angle(): number {
    return this._angle;
  }

  set angle(value: number) {
    this._angle = value;
    this.delta = this.updateDelta();
  }

  private updateDelta(): Vector2D {
    return new Vector2D(Math.cos(this._angle), -Math.sin(this._angle));
  }
}
