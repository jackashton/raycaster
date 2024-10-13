import { RenderContext } from './renderContext';
import { Player } from './player';

export interface Component {
  update: (deltatTime: number) => void;
  render: (context: RenderContext, player?: Player) => void;
}
