export interface GameObject {
  update?: (deltatTime: number) => void;
}

export class Scene {
  objects: GameObject[] = [];

  addObject(obj: GameObject): void {
    this.objects.push(obj);
  }
}

export type AnimatedTexture = {
  frames: number[];
  duration: number;
  currentFrame: number;
  lastTime: number;
};

export type AnimatedTextures = Record<number, AnimatedTexture>;
