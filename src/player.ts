import { Vector2D } from './utils/vector';
import { Component } from './types';
import { RenderContext } from './renderContext';
import { Action, InputController } from './inputController';
import normalizeAngle from './utils/normalizeAngle';
import {toClipSpace} from "./utils/toClipSpace";

export class Player implements Component {
  position: Vector2D;
  color: [number, number, number, number];
  private _angle: number;
  delta: Vector2D;
  moveSpeed: number;
  turnSpeed: number;
  input: InputController = new InputController();

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

  render(context: RenderContext) {
    const { gl, program, width, height } = context;
    this.render2D(gl, program, width, height, true);
  }

  // Basic 2D render logic for the player (top-down view)
  private render2D(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    width: number,
    height: number,
    showDirection = false,
  ) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(toClipSpace(width, height, this.position.x, this.position.y)),
      gl.STATIC_DRAW,
    );

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getUniformLocation(program, 'u_color');
    gl.uniform4fv(colorLocation, this.color);

    gl.drawArrays(gl.POINTS, 0, 1);

    if (showDirection) {
      // draw player direction line
      const end = this.position.add(this.delta.multiply(20));
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          ...toClipSpace(width, height, this.position.x, this.position.y),
          ...toClipSpace(width, height, end.x, end.y),
        ]),
        gl.STATIC_DRAW,
      );
      gl.drawArrays(gl.LINES, 0, 2);
    }
  }
}
