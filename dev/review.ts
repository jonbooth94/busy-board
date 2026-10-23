// Dev-only art review page. Not part of the production build.
import '../src/style.css';
import iconUrl from '../assets/icon.svg?url';
import { drawArt } from '../src/art';
import { objects } from '../src/config';
import type { Reaction } from '../src/config/types';

const icons = document.getElementById('icons')!;
for (const [size, label] of [[60, '60px'], [76, '76px (iPad)'], [180, '180px']] as const) {
  icons.insertAdjacentHTML('beforeend', `<div><img class="square" src="${iconUrl}" width="${size}" height="${size}" alt="">${label}</div>`);
}

const grid = document.getElementById('grid')!;
for (const o of objects) {
  const fig = document.createElement('figure');
  const cell = document.createElement('div');
  cell.className = 'cell';
  const { svg, handle } = drawArt(o.art);
  cell.append(svg);
  const buttons = document.createElement('div');
  buttons.className = 'states';
  fig.append(cell, Object.assign(document.createElement('figcaption'), { textContent: `${o.name} (${o.type})` }), buttons);
  grid.append(fig);

  const show = (label: string, sprite: string | undefined, r: Reaction | undefined) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      const pose = r?.sprite ?? sprite;
      if (pose) {
        svg.dataset.sprite = pose;
        handle.sprite?.(pose);
      }
      if (r?.anim) (handle.anims as Record<string, () => void>)[r.anim]?.();
      if (handle.tick) {
        let left = o.durationMs ?? 2000;
        const step = () => {
          left = Math.max(0, left - 16);
          handle.tick!(16, left);
          if (left > 0) requestAnimationFrame(step);
        };
        if (label !== o.initial) requestAnimationFrame(step);
      }
    };
    buttons.append(b);
  };
  for (const [name, s] of Object.entries(o.states ?? {})) show(name, s.sprite ?? name, s.onEnter);
  for (const z of o.zones ?? []) show(`zone ${z.id}`, undefined, z.onEnter);
  const initial = o.initial ? o.states?.[o.initial] : undefined;
  if (o.initial) {
    svg.dataset.sprite = initial?.sprite ?? o.initial;
    handle.sprite?.(svg.dataset.sprite);
  }
}
