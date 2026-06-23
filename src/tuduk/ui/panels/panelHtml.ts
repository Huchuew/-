export function subTabs(active: string, items: { id: string; label: string }[], lockId?: string): string {
  return `<div class="sub-tabs">${items.map(i =>
    `<button class="sub-tab ${active === i.id ? 'active' : ''}${lockId === i.id ? ' sub-tab-locked' : ''}" data-sub="${i.id}">${i.label}</button>`,
  ).join('')}</div>`;
}

export function worldNavGrid(active: string, items: { id: string; icon: string; label: string }[]): string {
  const cols = items.length <= 3 ? 3 : 3;
  return `<nav class="world-nav-grid cols-${cols}">${items.map(i =>
    `<button type="button" class="world-nav-item sub-tab ${active === i.id ? 'active' : ''}" data-sub="${i.id}">
      <span class="world-nav-icon">${i.icon}</span>
      <span class="world-nav-label">${i.label}</span>
    </button>`,
  ).join('')}</nav>`;
}

export function lodgingSection(title: string, body: string): string {
  return `<section class="lodging-section">
    <h4 class="lodging-section-head">${title}</h4>
    <div class="lodging-section-body">${body}</div>
  </section>`;
}

export function panelDetails(summary: string, body: string): string {
  if (!body.trim()) return '';
  return `<details class="panel-details">
    <summary>${summary}</summary>
    <div class="panel-details-body">${body}</div>
  </details>`;
}
