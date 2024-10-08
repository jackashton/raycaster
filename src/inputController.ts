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

export { InputController, Action };
