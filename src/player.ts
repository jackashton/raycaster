import { Vector2D } from './utils/vector';

export class Player {
  position: Vector2D;
  color: [number, number, number, number];
  angle: number;
  delta: Vector2D;
  moveSpeed: number;
  turnSpeed: number;

  constructor(position: Vector2D, color: [number, number, number, number]) {
    this.position = position;
    this.color = color;
    this.angle = Math.PI / 2;
    this.delta = new Vector2D(Math.cos(this.angle), -Math.sin(this.angle));
    this.moveSpeed = 5;
    this.turnSpeed = Math.PI / 64;
  }

  updateDelta() {
    this.delta = new Vector2D(Math.cos(this.angle), -Math.sin(this.angle));
  }
}
