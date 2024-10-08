import { Player } from './player';
import { InputController, Action } from './inputController';
import { CollisionManager } from './collisionManager';
import { Vector2D } from './utils/vector';
import normalizeAngle from './utils/normalizeAngle';

class PlayerController {
  private player: Player;
  private input: InputController;
  private collisionManager: CollisionManager;

  constructor(player: Player, input: InputController, collisionManager: CollisionManager) {
    this.player = player;
    this.input = input;
    this.collisionManager = collisionManager;
  }

  update() {
    let newPlayerPosition = this.player.position;
    const moveDirection = this.input.isActionPressed(Action.MOVE_RIGHT)
      ? -1
      : this.input.isActionPressed(Action.MOVE_LEFT)
        ? 1
        : 0;

    // Strafing movement
    if (moveDirection) {
      if (this.input.isActionPressed(Action.STRAFE)) {
        const strafeAngle = this.player.angle + (Math.PI / 2) * moveDirection;
        newPlayerPosition = this.player.position.add(
          new Vector2D(Math.cos(strafeAngle), -Math.sin(strafeAngle)).multiply(this.player.moveSpeed),
        );
      } else {
        this.player.angle = normalizeAngle(this.player.angle + moveDirection * this.player.turnSpeed);
      }
    }

    // Forward/backward movement
    if (this.input.isActionPressed(Action.MOVE_UP)) {
      newPlayerPosition = this.player.position.add(this.player.delta.multiply(this.player.moveSpeed));
    }
    if (this.input.isActionPressed(Action.MOVE_DOWN)) {
      newPlayerPosition = this.player.position.subtract(this.player.delta.multiply(this.player.moveSpeed));
    }

    // Collision detection
    const collision = this.collisionManager.isColliding(newPlayerPosition, this.player.delta, 10);

    if (!collision.xCollision) {
      this.player.position.x = newPlayerPosition.x;
    }

    if (!collision.yCollision) {
      this.player.position.y = newPlayerPosition.y;
    }

    // Handle interaction collision (for doors)
    if (this.input.isActionPressed(Action.INTERACT)) {
      this.collisionManager.handleInteraction(this.player.position, this.player.delta, 25);
    }
  }
}

export { PlayerController };
