// Lays out the 4 x 3 board from config and runs the animation loop while anything is moving.

import type { AudioEngine } from './audio/engine';
import type { BoardConfig, ObjectConfig } from './config/types';
import type { EventLog } from './log';
import { ObjectController } from './engine/controller';

export class Board {
  controllers: ObjectController[] = [];
  private frame = 0;
  private last = 0;

  constructor(
    readonly el: HTMLElement,
    private readonly cfg: BoardConfig,
    private readonly audio: AudioEngine,
    private readonly log: EventLog,
  ) {
    el.style.setProperty('--cols', String(cfg.cols));
    el.style.setProperty('--rows', String(cfg.rows));
  }

  /** (Re)build every slot. Hidden objects leave an empty plate, like a gap on a real shelf. */
  build(objects: readonly ObjectConfig[], hidden: ReadonlySet<string>): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.el.replaceChildren();
    this.el.classList.remove('winding-down');
    this.controllers = [];
    const bySlot = new Map(objects.filter((o) => !hidden.has(o.id)).map((o) => [`${o.slot.col},${o.slot.row}`, o]));
    for (let row = 1; row <= this.cfg.rows; row++) {
      for (let col = 1; col <= this.cfg.cols; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridColumn = String(col);
        cell.style.gridRow = String(row);
        this.el.append(cell);
        const obj = bySlot.get(`${col},${row}`);
        if (!obj) {
          cell.classList.add('empty');
          continue;
        }
        cell.dataset.id = obj.id;
        cell.dataset.type = obj.type;
        try {
          this.controllers.push(
            new ObjectController(obj, cell, {
              audio: this.audio,
              log: (id, event, state) => this.log.log(id, event, state),
              wake: () => this.wake(),
            }),
          );
        } catch (err) {
          // A broken drawing leaves an empty plate instead of breaking the board.
          console.warn(`[${obj.id}] could not be drawn`, err);
          cell.replaceChildren();
          cell.classList.add('empty');
          delete cell.dataset.id;
        }
      }
    }
  }

  get awake(): ObjectController[] {
    return this.controllers.filter((c) => !c.asleep);
  }

  /** Run the animation loop until nothing is moving. */
  wake(): void {
    if (this.frame) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, Math.max(0, now - this.last));
      this.last = now;
      let busy = false;
      for (const c of this.controllers) busy = c.update(now, dt) || busy;
      this.frame = busy ? requestAnimationFrame(loop) : 0;
    };
    this.frame = requestAnimationFrame(loop);
  }
}
