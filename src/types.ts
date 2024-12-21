export interface GameObject {
  update?: (deltatTime: number) => void;
}

export class Scene {
  objects: GameObject[] = [];

  addObject(obj: GameObject): void {
    this.objects.push(obj);
  }
}
