import { DEFAULT_MODIFIERS } from '../data/constants';
import type { RunModifiers } from '../data/types';
import { BoardModel } from './BoardModel';
import { ComboSystem } from './ComboSystem';

export class GameState {
  score = 0;
  board = new BoardModel();
  combo = new ComboSystem();
  modifiers: RunModifiers = { ...DEFAULT_MODIFIERS };

  startRun(seed?: number) {
    this.score = 0;
    this.modifiers = { ...DEFAULT_MODIFIERS };
    this.combo.reset();
    this.board = new BoardModel(seed);
    this.board.fill(this.modifiers);
  }
}
