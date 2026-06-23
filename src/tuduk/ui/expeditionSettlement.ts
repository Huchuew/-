import type {
  AdventureRunStats, DefeatLog, GameSave, TycoonSettlement,
} from '../types';
import { CHAR_MAP } from '../data/characters';
import { MATERIAL_LABELS } from '../data/equipment';
import { estimateMaterialsSellGold } from '../systems/VendorSystem';
import { formatMaterialSummary } from '../systems/TycoonExpansionSystem';
import { INCAP_DURATION_SEC } from '../systems/CharacterStatusSystem';
import { bindTap } from '../utils/bindTap';

export interface SettlementRow {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}

export interface SettlementSection {
  title: string;
  rows: SettlementRow[];
}

export interface ExpeditionSettlementReport {
  kind: 'return' | 'defeat';
  title: string;
  subtitle: string;
  sections: SettlementSection[];
  tips: string[];
}

export interface BuildSettlementInput {
  kind: 'return' | 'defeat';
  runStats: AdventureRunStats;
  runMats: Record<string, number>;
  deepestFloor: number;
  defeatLog?: DefeatLog;
  settlement: TycoonSettlement;
  supplyBoostPct: number;
  returnedPotions: number;
  labPotions: number;
  save: GameSave;
}

export function buildExpeditionSettlementReport(input: BuildSettlementInput): ExpeditionSettlementReport {
  const {
    kind, runStats, runMats, deepestFloor, defeatLog, settlement,
    supplyBoostPct, returnedPotions, labPotions, save,
  } = input;
  const matSell = estimateMaterialsSellGold(save, runMats);
  const sections: SettlementSection[] = [];

  if (kind === 'defeat' && defeatLog) {
    sections.push({
      title: '💀 전멸 요약',
      rows: [
        {
          label: '전투 지역',
          value: `${defeatLog.regionName ?? '?'} · ${defeatLog.affixName ?? ''}`.trim(),
        },
        {
          label: '숙소 골드 차감',
          value: defeatLog.goldLost > 0
            ? `-🪙 ${defeatLog.goldLost.toLocaleString()}`
            : '첫 전멸 — 패널티 없음',
          tone: defeatLog.goldLost > 0 ? 'bad' : 'neutral',
        },
        {
          label: '원정 중 획득 골드',
          value: `🪙 ${defeatLog.sessionGoldForfeited.toLocaleString()} (정산 반영됨)`,
          tone: 'neutral',
        },
        {
          label: '행동불능',
          value: `파티 전원 ${INCAP_DURATION_SEC}초`,
          tone: 'bad',
        },
      ],
    });
    if (defeatLog.lastHit) {
      sections[0]!.rows.push({
        label: '마지막 타격',
        value: `${defeatLog.lastHit.attacker} → ${defeatLog.lastHit.target} (${defeatLog.lastHit.damage.toLocaleString()})`,
        tone: 'bad',
      });
    }
    if (defeatLog.synergyLines?.length) {
      sections.push({
        title: '💡 전투 힌트',
        rows: defeatLog.synergyLines.slice(0, 4).map(line => ({
          label: '조언',
          value: line,
          tone: 'neutral' as const,
        })),
      });
    }
    if (defeatLog.powerSnapshot?.length) {
      sections.push({
        title: '📊 전투력 분석',
        rows: defeatLog.powerSnapshot.map(r => ({
          label: r.label,
          value: r.value,
          tone: r.tone ?? 'neutral',
        })),
      });
    }
  } else {
    sections.push({
      title: '🏠 귀환 요약',
      rows: [
        { label: '도달 층', value: `최고 ${deepestFloor}층`, tone: 'good' },
        { label: '원정 골드', value: `🪙 ${runStats.goldEarned.toLocaleString()}`, tone: 'good' },
      ],
    });
  }

  sections.push({
    title: '⚔️ 전투 기록',
    rows: [
      { label: '처치', value: `${runStats.kills.toLocaleString()}마리` },
      { label: '가한 피해', value: runStats.damageDealt.toLocaleString() },
      { label: '받은 피해', value: runStats.damageTaken.toLocaleString() },
      { label: '투닥 추가 피해', value: runStats.touchDamage.toLocaleString() },
      ...buildCharContributionRows(runStats),
    ],
  });

  const matRows = buildMaterialRows(runMats, matSell);
  if (matRows.length) {
    sections.push({ title: '📦 획득 재료', rows: matRows });
  }

  const tycoonRows: SettlementRow[] = [];
  if (settlement.caravanGold && settlement.caravanGold > 0) {
    tycoonRows.push({
      label: '캐러밴 보너스',
      value: `🪙 +${settlement.caravanGold.toLocaleString()}`,
      tone: 'good',
    });
  }
  const tycoonGold = settlement.gold - (settlement.caravanGold ?? 0);
  if (tycoonGold > 0) {
    tycoonRows.push({
      label: '숙소 타이쿤',
      value: `🪙 +${tycoonGold.toLocaleString()}`,
      tone: 'good',
    });
  }
  const settledMats = formatMaterialSummary(settlement.mats, 6);
  if (settledMats) {
    tycoonRows.push({ label: '창고 입고', value: settledMats, tone: 'good' });
  }
  if (supplyBoostPct > 0) {
    tycoonRows.push({
      label: '공급 부스트',
      value: `+${supplyBoostPct}% (30분)`,
      tone: 'good',
    });
  }
  if (returnedPotions > 0) {
    tycoonRows.push({ label: '포션 반납', value: `💊 ${returnedPotions}개 → 창고` });
  }
  if (labPotions > 0) {
    tycoonRows.push({ label: '연구실 제작', value: `💊 +${labPotions}개` });
  }
  if (tycoonRows.length) {
    sections.push({ title: '🏘️ 숙소 정산', rows: tycoonRows });
  }

  const tips: string[] = [];
  if (matSell.qty > 0) {
    tips.push(`획득 재료 ${matSell.qty}개 — [상점]에서 약 🪙${matSell.total.toLocaleString()}에 판매 가능`);
  }
  if (kind === 'defeat') {
    tips.push('행동불능이 풀리면 HP 회복 후 다시 원정을 떠나세요');
    if (defeatLog?.affixTip) tips.push(defeatLog.affixTip);
  } else {
    tips.push('HP가 회복되면 [던전]에서 다시 던전에 입장할 수 있습니다');
  }

  return {
    kind,
    title: kind === 'defeat' ? '💀 원정 전멸' : '🏠 숙소 귀환',
    subtitle: kind === 'defeat'
      ? '파티가 전멸해 숙소로 후퇴했습니다'
      : '원정이 종료되어 정산을 마쳤습니다',
    sections,
    tips,
  };
}

function buildCharContributionRows(runStats: AdventureRunStats): SettlementRow[] {
  const entries = Object.entries(runStats.byChar)
    .map(([id, st]) => ({
      id,
      name: CHAR_MAP[id]?.name ?? id,
      dealt: st.damageDealt,
      taken: st.damageTaken,
      heal: st.healDone,
    }))
    .filter(e => e.dealt > 0 || e.taken > 0 || e.heal > 0)
    .sort((a, b) => b.dealt - a.dealt)
    .slice(0, 4);
  if (!entries.length) return [];
  return entries.map(e => ({
    label: e.name,
    value: `⚔️${e.dealt.toLocaleString()} · 🛡️${e.taken.toLocaleString()}${e.heal > 0 ? ` · 💚${e.heal.toLocaleString()}` : ''}`,
    tone: 'neutral' as const,
  }));
}

function buildMaterialRows(
  mats: Record<string, number>,
  sell: { total: number; qty: number },
): SettlementRow[] {
  const rows: SettlementRow[] = Object.entries(mats)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, qty]) => ({
      label: MATERIAL_LABELS[key] ?? key,
      value: `×${qty}`,
      tone: 'neutral' as const,
    }));
  if (sell.qty > 0) {
    rows.push({
      label: '상점 판매 예상',
      value: `🪙 ${sell.total.toLocaleString()}`,
      tone: 'good' as const,
    });
  }
  return rows;
}

export function showExpeditionSettlementModal(
  root: HTMLElement,
  report: ExpeditionSettlementReport,
  onClose?: () => void,
): void {
  root.querySelector('#expedition-settlement-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'expedition-settlement-modal';
  overlay.className = 'settlement-modal';
  overlay.innerHTML = `
    <div class="settlement-panel" role="dialog" aria-modal="true">
      <header class="settlement-head ${report.kind}">
        <div>
          <h2>${report.title}</h2>
          <p>${report.subtitle}</p>
        </div>
        <button type="button" class="settlement-close" aria-label="닫기">✕</button>
      </header>
      <div class="settlement-body">
        ${report.sections.map(sec => `
          <section class="settlement-section">
            <h3>${sec.title}</h3>
            <div class="settlement-rows">
              ${sec.rows.map(row => `
                <div class="settlement-row ${row.tone ?? 'neutral'}">
                  <span class="settlement-label">${row.label}</span>
                  <span class="settlement-value">${row.value}</span>
                </div>
              `).join('')}
            </div>
          </section>
        `).join('')}
        ${report.tips.length ? `
          <section class="settlement-tips">
            ${report.tips.map(t => `<p class="hint">${t}</p>`).join('')}
          </section>
        ` : ''}
      </div>
      <footer class="settlement-foot">
        <button type="button" class="btn-primary settlement-ok">확인</button>
      </footer>
    </div>
  `;

  const close = () => {
    overlay.remove();
    onClose?.();
  };
  bindTap(overlay.querySelector('.settlement-close'), close);
  bindTap(overlay.querySelector('.settlement-ok'), close);
  bindTap(overlay, e => {
    if (e.target === overlay) close();
  });

  root.appendChild(overlay);
}
