// Parent settings panel (behind the gate). This is the only place in the app with text.

import type { ObjectConfig, Settings, SettingsConfig, VolumeLevel } from '../config/types';
import { type EventLog, clearEvents, countEvents, readEvents, toCsv } from '../log';

export interface PanelDeps {
  el: HTMLElement;
  objects: readonly ObjectConfig[];
  cfg: SettingsConfig;
  log: EventLog;
  settings(): Settings;
  /** Called on every change; `hiddenChanged` means the board needs rebuilding. */
  onChange(s: Settings): void;
  /** Volume preview. */
  onVolume(level: VolumeLevel): void;
  /** "Back to playing" (only offered while a session is playing). */
  onResume(): void;
  /** "Start a new session": back to the closed cover. */
  onNewSession(): void;
}

const VOLUME_LABELS: Record<VolumeLevel, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export class ParentPanel {
  private canResume = false;

  constructor(private readonly d: PanelDeps) {
    d.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    d.el.addEventListener('change', (e) => this.onInput(e.target as HTMLInputElement));
    d.el.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action) void this.onAction(action);
    });
  }

  get isOpen(): boolean {
    return !this.d.el.hidden;
  }

  open(canResume: boolean): void {
    this.canResume = canResume;
    this.render();
    this.d.el.hidden = false;
    void this.refreshCount();
  }

  close(): void {
    this.d.el.hidden = true;
  }

  private render(): void {
    const s = this.d.settings();
    const hidden = new Set(s.hidden);
    const radio = (name: string, value: string, label: string, checked: boolean) =>
      `<label class="chip"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
    const prompts = this.d.objects.filter((o) => !hidden.has(o.id));
    const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.csv', { type: 'text/csv' })] });

    this.d.el.innerHTML = `
      <div class="sheet" role="dialog" aria-label="Parent settings">
        <header>
          <h1>Parent settings</h1>
          <div class="actions">
            ${this.canResume ? '<button type="button" class="primary" data-action="resume">Back to playing</button>' : ''}
            <button type="button" class="${this.canResume ? '' : 'primary'}" data-action="new">Start a new session</button>
          </div>
        </header>

        <section>
          <h2>Session length</h2>
          <p class="hint">One timer for the whole app. Everything winds down over the last 30 seconds, then says goodnight.</p>
          <div class="row">${this.d.cfg.sessionOptions
            .map((m) => radio('session', String(m), m === null ? 'Off' : `${m} min`, s.sessionMinutes === m))
            .join('')}</div>
        </section>

        <section>
          <h2>Volume cap</h2>
          <div class="row">${(['low', 'medium', 'high'] as VolumeLevel[]).map((v) => radio('volume', v, VOLUME_LABELS[v], s.volume === v)).join('')}</div>
        </section>

        <section>
          <h2>Toys on the board</h2>
          <p class="hint">Hide a few and rotate them, like toys on a shelf.</p>
          <div class="grid">${this.d.objects
            .map((o) => `<label class="check"><input type="checkbox" name="visible" value="${o.id}" ${hidden.has(o.id) ? '' : 'checked'}><span>${esc(o.name)}</span></label>`)
            .join('')}</div>
        </section>

        <section>
          <h2>Co-play prompts</h2>
          <div class="row">${radio('prompts', 'on', 'Show', s.coPlayPrompts)}${radio('prompts', 'off', 'Hide', !s.coPlayPrompts)}</div>
          ${s.coPlayPrompts ? `<div class="card"><h3>Things to say while playing</h3><ul>${prompts.map((o) => `<li><b>${esc(o.name)}:</b> ${esc(o.prompt)}</li>`).join('')}</ul></div>` : ''}
        </section>

        <section>
          <h2>Playtest log</h2>
          <p class="hint">Stays on this device. <span data-count>…</span></p>
          <div class="row">
            ${canShare ? '<button type="button" data-action="share">Share CSV</button>' : ''}
            <button type="button" data-action="download">Download CSV</button>
            <button type="button" class="danger" data-action="clear">Clear log</button>
          </div>
        </section>

        <p class="hint foot">Lock the device to this app: Guided Access on iPad, screen pinning on Android (see README). Version ${esc(document.documentElement.dataset.version ?? '')}</p>
      </div>`;
  }

  private async refreshCount(): Promise<void> {
    await this.d.log.flush();
    let n: number;
    try {
      n = await countEvents();
    } catch {
      n = 0;
    }
    const el = this.d.el.querySelector('[data-count]');
    if (el) el.textContent = `${n} event${n === 1 ? '' : 's'} recorded.`;
  }

  private onInput(input: HTMLInputElement): void {
    const s = { ...this.d.settings() };
    if (input.name === 'session') s.sessionMinutes = input.value === 'null' ? null : Number(input.value);
    else if (input.name === 'volume') {
      s.volume = input.value as VolumeLevel;
      this.d.onVolume(s.volume);
    } else if (input.name === 'prompts') s.coPlayPrompts = input.value === 'on';
    else if (input.name === 'visible') {
      const checked = [...this.d.el.querySelectorAll<HTMLInputElement>('input[name="visible"]:checked')].map((i) => i.value);
      if (checked.length === 0) {
        input.checked = true; // keep at least one toy on the board
        return;
      }
      s.hidden = this.d.objects.map((o) => o.id).filter((id) => !checked.includes(id));
    }
    this.d.onChange(s);
    if (input.name === 'prompts' || input.name === 'visible') {
      const scroll = this.d.el.querySelector('.sheet')?.scrollTop ?? 0;
      this.render();
      void this.refreshCount();
      this.d.el.querySelector('.sheet')?.scrollTo({ top: scroll });
    }
  }

  private async onAction(action: string): Promise<void> {
    if (action === 'resume') this.d.onResume();
    else if (action === 'new') this.d.onNewSession();
    else if (action === 'share' || action === 'download') await this.exportCsv(action === 'share');
    else if (action === 'clear') {
      if (!window.confirm('Delete every logged event on this device?')) return;
      await this.d.log.flush();
      await clearEvents().catch(() => undefined);
      await this.refreshCount();
    }
  }

  private async exportCsv(share: boolean): Promise<void> {
    await this.d.log.flush();
    const rows = await readEvents().catch(() => []);
    const d = new Date();
    const name = `busy-board-log-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`;
    const file = new File([toCsv(rows)], name, { type: 'text/csv' });
    if (share) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        return; // the parent closed the share sheet
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
