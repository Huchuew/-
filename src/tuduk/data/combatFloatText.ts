import type { CombatSkillDef } from './combatSkills';
import { ELEMENT_ICON } from './elemental';
import type { BuffApplyDetail } from '../systems/SkillCombat';
import type { CleanseTargetDetail, HealTargetDetail } from '../systems/HealerCombat';
import type { RegionAffix } from './regionAffixes';
import type { ElementType } from '../types';

export function skillPopIcon(skill: CombatSkillDef): string {
  switch (skill.skillKind) {
    case 'heal': return '💚';
    case 'cleanse': return '🧹';
    case 'block': return '🛡';
    case 'buff': return '✨';
    default:
      return skill.element !== 'none' ? ELEMENT_ICON[skill.element] : '⚔';
  }
}

export function popSkillDamage(skill: CombatSkillDef, amount: number): string {
  return `${skillPopIcon(skill)} -${amount}`;
}

export function popNormalHit(amount: number, aoe = false): string {
  return aoe ? `💥 -${amount}` : `-${amount}`;
}

export function popUltimate(icon: string, amount: number): string {
  return `${icon} -${amount}`;
}

export function popHeal(amount: number): string {
  return `💚 +${amount}`;
}

export function popHealTarget(healerName: string, targetName: string, amount: number): string {
  return `💚${healerName} → ${targetName} +${amount.toLocaleString()}`;
}

export function popBlock(pct: number): string {
  return `🛡 -${pct}%`;
}

export function popBuffFromDetails(details: BuffApplyDetail[]): string {
  if (!details.length) return '✨ 버프';
  const t = details[0]!;
  if (t.atkPct) return `✨ ATK+${t.atkPct}%`;
  if (t.defPct) return `✨ DEF+${t.defPct}%`;
  if (t.spdPct) return `✨ 공속+${t.spdPct}%`;
  return '✨ 버프';
}

export function popCleanseFromDetails(details: CleanseTargetDetail[]): string {
  const n = details.reduce((sum, d) => sum + d.removed.length, 0);
  return n > 0 ? `🧹 ×${n}` : '🧹';
}

export function popHealFromDetails(details: HealTargetDetail[], healerName?: string): string {
  if (!details.length) return popHeal(0);
  if (details.length === 1) {
    const d = details[0]!;
    return healerName ? popHealTarget(healerName, d.charName, d.amount) : popHeal(d.amount);
  }
  const total = details.reduce((sum, d) => sum + d.amount, 0);
  const names = details.map(d => d.charName).join(', ');
  return healerName
    ? `💚${healerName} → ${names} +${total.toLocaleString()}`
    : popHeal(total);
}

/** 성장 탭 등 상세 UI용 — 전투 팝과 분리 */
export function formatSkillBrief(skill: CombatSkillDef): { title: string; subtitle: string } {
  const icon = skillPopIcon(skill);
  const pct = Math.round(skill.procRate * 100);
  switch (skill.skillKind) {
    case 'heal':
      return {
        title: `${icon} ${skill.name}`,
        subtitle: `발동 ${pct}% · HP +${Math.round((skill.healPct ?? 0) * 100)}%`,
      };
    case 'cleanse':
      return {
        title: `${icon} ${skill.name}`,
        subtitle: `발동 ${pct}% · 디버프 ${skill.cleanseCount ?? 1}건`,
      };
    case 'block':
      return {
        title: `${icon} ${skill.name}`,
        subtitle: `발동 ${pct}% · 피해 -${Math.round((skill.blockPct ?? 0) * 100)}%`,
      };
    case 'buff': {
      const parts: string[] = [];
      if (skill.buffAtkMult) parts.push(`ATK +${Math.round((skill.buffAtkMult - 1) * 100)}%`);
      if (skill.buffDefMult) parts.push(`DEF +${Math.round((skill.buffDefMult - 1) * 100)}%`);
      if (skill.buffSpdMult) parts.push(`공속 +${Math.round((skill.buffSpdMult - 1) * 100)}%`);
      return {
        title: `${icon} ${skill.name}`,
        subtitle: `발동 ${pct}% · ${skill.buffParty ? '파티' : '자신'} ${parts.join(' ')}`,
      };
    }
    default: {
      const tier = skill.animTier >= 3 ? '필살' : skill.animTier >= 2 ? '강공' : '일반';
      return {
        title: `${icon} ${skill.name}`,
        subtitle: `발동 ${pct}% · ${tier}`,
      };
    }
  }
}

function stripMonsterPrefix(name: string): string {
  return name.replace(/^[★⚠]\s*/, '').trim();
}

/** 몬스터 조우 · 등장 배너 */
export function popEncounter(opts: {
  name: string;
  count: number;
  isBoss?: boolean;
  isElite?: boolean;
  isEpic?: boolean;
  element?: ElementType;
}): string {
  const clean = stripMonsterPrefix(opts.name);
  const n = opts.count > 1 ? ` ×${opts.count}` : '';
  if (opts.isBoss) return `👑 ${clean}`;
  if (opts.isEpic) return `★ ${clean}${n}`;
  if (opts.isElite) return `⚠ ${clean}${n}`;
  const el = opts.element && opts.element !== 'none' ? ELEMENT_ICON[opts.element] : '👹';
  return `${el} ${clean}${n}`;
}

/** 층 어픽스 — 이름만 */
export function popAffixBrief(affix: RegionAffix): string {
  return `${affix.icon} ${affix.name}`;
}

export function popBossGrudge(pct: number): string {
  return pct > 0 ? `👁 +${pct}%` : '';
}
