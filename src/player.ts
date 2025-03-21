import { GameObject } from './types';
import { Vector2D } from './utils/vector';
import normalizeAngle from './utils/normalizeAngle';
import { MapCollisionManager } from './map';

enum Action {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  STRAFE = 'STRAFE',
  INTERACT = 'INTERACT',
}

class InputController {
  private keyMappings: Record<string, Action>;
  private keysPressed: Partial<Record<Action, boolean>> = {};

  constructor(customMappings?: Record<string, Action>) {
    // Default key mappings
    this.keyMappings = customMappings || {
      W: Action.MOVE_UP,
      w: Action.MOVE_UP,
      ArrowUp: Action.MOVE_UP,
      S: Action.MOVE_DOWN,
      s: Action.MOVE_DOWN,
      ArrowDown: Action.MOVE_DOWN,
      A: Action.MOVE_LEFT,
      a: Action.MOVE_LEFT,
      ArrowLeft: Action.MOVE_LEFT,
      D: Action.MOVE_RIGHT,
      d: Action.MOVE_RIGHT,
      ArrowRight: Action.MOVE_RIGHT,
      Shift: Action.STRAFE,
      E: Action.INTERACT,
      e: Action.INTERACT,
    };

    // Bind event listeners
    window.addEventListener('keydown', this.handleKeyboardEvent.bind(this, true));
    window.addEventListener('keyup', this.handleKeyboardEvent.bind(this, false));
  }

  private handleKeyboardEvent(isPressed: boolean, event: KeyboardEvent) {
    const action = this.keyMappings[event.key];
    if (action) {
      this.keysPressed[action] = isPressed;
    }

    // Handle strafing with Shift key
    this.keysPressed[Action.STRAFE] = event.shiftKey;
  }

  isActionPressed(action: Action): boolean {
    return !!this.keysPressed[action];
  }
}

export class Player implements GameObject {
  position: Vector2D;
  private _angle: number;
  delta: Vector2D;
  moveSpeed: number;
  turnSpeed: number;
  input: InputController = new InputController();
  mapCollisionManager: MapCollisionManager;

  constructor(position: Vector2D, mapCollisionManager: MapCollisionManager) {
    this.position = position;
    this._angle = Math.PI / 2;
    this.delta = this.updateDelta();
    this.moveSpeed = 5;
    this.turnSpeed = Math.PI / 64;
    this.mapCollisionManager = mapCollisionManager;
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

  update() {
    let moveVector = new Vector2D(0, 0);

    // Forward/backward movement
    if (this.input.isActionPressed(Action.MOVE_UP)) {
      moveVector = moveVector.add(this.delta);
    }
    if (this.input.isActionPressed(Action.MOVE_DOWN)) {
      moveVector = moveVector.subtract(this.delta);
    }

    // Strafing movement
    const moveDirection = this.input.isActionPressed(Action.MOVE_RIGHT)
      ? -1
      : this.input.isActionPressed(Action.MOVE_LEFT)
        ? 1
        : 0;

    if (moveDirection && this.input.isActionPressed(Action.STRAFE)) {
      const strafeAngle = this.angle + (Math.PI / 2) * moveDirection;
      moveVector = moveVector.add(new Vector2D(Math.cos(strafeAngle), -Math.sin(strafeAngle)));
    } else if (moveDirection) {
      this.angle = normalizeAngle(this.angle + moveDirection * this.turnSpeed);
    }

    // Normalize movement vector to ensure consistent speed
    if (moveVector.magnitude() > 0) {
      moveVector = moveVector.normalize().multiply(this.moveSpeed);
    }

    const newPlayerPosition = this.position.add(moveVector);

    // Collision detection
    const collision = this.mapCollisionManager.checkCollision(newPlayerPosition, this.delta, 10);

    if (collision.xCollision) {
      newPlayerPosition.x = this.position.x;
    }

    if (collision.yCollision) {
      newPlayerPosition.y = this.position.y;
    }

    // Handle interaction collision (i.e. for doors)
    if (this.input.isActionPressed(Action.INTERACT)) {
      this.mapCollisionManager.checkCollision(newPlayerPosition, this.delta, 25, true);
    }

    this.position = newPlayerPosition;
  }
}
