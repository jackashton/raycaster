export class RenderContext {
  constructor(
    public gl: WebGL2RenderingContext,
    public program: WebGLProgram,
    public width: number,
    public height: number,
  ) {}
}
