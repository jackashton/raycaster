import { BoundingBox, Collidable, GameObject, MapCollisionManager } from './types';
import { Vector2D } from './utils/vector';
import normalizeAngle from './utils/normalizeAngle';

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

export class Player implements GameObject, Collidable {
  position: Vector2D;
  private _angle: number;
  delta: Vector2D;
  moveSpeed: number;
  turnSpeed: number;
  input: InputController = new InputController();
  mapCollisionManager: MapCollisionManager;

  constructor(position: Vector2D) {
    this.position = position;
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

  update() {
    let newPlayerPosition = this.position;
    const moveDirection = this.input.isActionPressed(Action.MOVE_RIGHT)
      ? -1
      : this.input.isActionPressed(Action.MOVE_LEFT)
        ? 1
        : 0;

    // Strafing movement
    if (moveDirection) {
      if (this.input.isActionPressed(Action.STRAFE)) {
        const strafeAngle = this.angle + (Math.PI / 2) * moveDirection;
        newPlayerPosition = this.position.add(
          new Vector2D(Math.cos(strafeAngle), -Math.sin(strafeAngle)).multiply(this.moveSpeed),
        );
      } else {
        this.angle = normalizeAngle(this.angle + moveDirection * this.turnSpeed);
      }
    }

    // Forward/backward movement
    if (this.input.isActionPressed(Action.MOVE_UP)) {
      newPlayerPosition = this.position.add(this.delta.multiply(this.moveSpeed));
    }
    if (this.input.isActionPressed(Action.MOVE_DOWN)) {
      newPlayerPosition = this.position.subtract(this.delta.multiply(this.moveSpeed));
    }

    // TODO remove once collision is added back
    this.position = newPlayerPosition;

    // Collision detection
    // const collision = this.collisionManager.isColliding(newPlayerPosition, this.delta, 10);
    //
    // if (!collision.xCollision) {
    //   this.position.x = newPlayerPosition.x;
    // }
    //
    // if (!collision.yCollision) {
    //   this.position.y = newPlayerPosition.y;
    // }
    //
    // // Handle interaction collision (for doors)
    // if (this.input.isActionPressed(Action.INTERACT)) {
    //   this.collisionManager.handleInteraction(this.position, this.delta, 25);
    // }
  }

  getBounds(): BoundingBox {
    return {
      x: this.position.x,
      y: this.position.y,
      width: 0,
      height: 0,
      intersects: () => false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCollision(other: Collidable) {}
}
