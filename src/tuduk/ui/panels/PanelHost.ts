import type { GameSave } from '../../types';
import type { AdventureSystem } from '../../systems/AdventureSystem';

export type EndgameSub = 'spire' | 'relics' | 'ascend';
export type CollectionSub = 'bag' | 'achieve';

/** 탭 렌더 모듈이 PanelManager와 공유하는 최소 계약 */
export interface PanelHost {
  readonly panelEl: HTMLElement;
  getSave(): GameSave;
  getAdv(): AdventureSystem;
  onRefresh(): void;
  render(): void;
  showToast(msg: string, success?: boolean): void;
  enterDungeonRun(): void;
  panelDetails(summary: string, body: string): string;
  subTabs(active: string, items: { id: string; label: string }[], lockId?: string): string;

  endgameSub: EndgameSub;
  collectionSub: CollectionSub;
  ascendCharId: string;
}
