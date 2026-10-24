import './style.css';
import { AudioEngine } from './audio/engine';
import { Board } from './board';
import { board as boardCfg, objects, settingsConfig } from './config';
import type { Settings } from './config/types';
import { type Animal, animals } from './critters/animals';
import { ColoringScreen } from './critters/coloring';
import { homeIcon } from './critters/icons';
import { Picker } from './critters/picker';
import { TouchRouter } from './engine/router';
import { EventLog } from './log';
import { setupGate } from './parent/gate';
import { ParentPanel } from './parent/panel';
import { initPwa, maybeApplyUpdate } from './pwa';
import { Session } from './session';
import { loadDebug, loadSettings, saveSettings } from './settings';
import { type App, type View, Views, setupChooser } from './views';

document.documentElement.dataset.version = __APP_VERSION__;

// ---------- Kid-proofing ----------
for (const type of ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'dblclick']) {
  document.addEventListener(type, (e) => {
    if (!(e.target as Element | null)?.closest?.('#parent')) e.preventDefault();
  }, { passive: false });
}

const debug = loadDebug();
let settings: Settings = loadSettings(settingsConfig, objects.map((o) => o.id));

// ---------- Audio: every sound is rendered now, before the board appears ----------
const audio = new AudioEngine(boardCfg.maxVoices);
audio.setVolume(settingsConfig.volumeLevels[settings.volume]);
if (debug.recordSounds) {
  const played: string[] = [];
  (window as unknown as { __bbSounds: string[] }).__bbSounds = played;
  audio.onPlay = (name) => played.push(name);
}
// Resume audio on every gesture (iPad and Android suspend it when the app is backgrounded).
document.addEventListener('pointerdown', () => {
  if (session.screen !== 'cover') audio.unlock();
}, { capture: true, passive: true });

// ---------- Views: the chooser, the board and Color Critters ----------
const log = new EventLog();
let openedAt = 0;
const views = new Views((view) => {
  if (view === 'board') {
    router.invalidate(); // hit rects are measured lazily, now that the board is laid out
    session.touched();
  }
  syncRouter();
});

/** The board only takes touches while it is showing and the doors are open. */
function syncRouter(): void {
  router.enabled = session.screen === 'play' && views.view === 'board';
  if (!router.enabled) router.releaseAll();
}

function show(view: View, detail: string = view): void {
  views.show(view);
  log.log('app', 'navigate', detail);
}

setupChooser(document.getElementById('chooser') as HTMLElement, (app: App) => {
  // Ignore a second tap that lands while the doors are still sliding open.
  if (session.screen !== 'play' || performance.now() - openedAt < 700) return;
  if (app === 'board') {
    audio.playAny(boardCfg.coverOpen.sounds);
    show('board');
  } else {
    audio.playAny(['chime_1', 'chime_2']);
    show('picker');
  }
});

function goChooser(): void {
  audio.playAny(['boop_1', 'boop_2', 'boop_3']);
  show('chooser');
}

for (const id of ['board-home', 'picker-home']) {
  const btn = document.getElementById(id) as HTMLButtonElement;
  btn.innerHTML = homeIcon;
  btn.addEventListener('click', goChooser);
}

// ---------- Color Critters ----------
const coloring = new ColoringScreen(audio, goPicker, (animal) => {
  picker.hide(animal.id); // its art failed to load
  goPicker();
});
const picker = new Picker(document.getElementById('grid') as HTMLElement, animals, openAnimal);

function openAnimal(animal: Animal): void {
  show('coloring', `coloring:${animal.id}`);
  void coloring.open(animal);
}

/** Saves the drawing (if one is open) and refreshes its picker thumbnail once stored. */
function closeColoring(): void {
  const id = coloring.currentAnimal?.id;
  const saved = coloring.close();
  void saved.then(async () => {
    if (id) await picker.refresh(id);
    maybeApplyUpdate();
  });
}

function goPicker(): void {
  closeColoring();
  show('picker');
}

// ---------- Board ----------
const boardEl = document.getElementById('board') as HTMLElement;
const board = new Board(boardEl, boardCfg, audio, log);
const router = new TouchRouter(boardEl, boardCfg, {
  onAnyTouch: () => session.touched(),
  onEmpty: () => {
    audio.playAny(boardCfg.emptyTap.sounds);
    log.log('empty', 'tap', '');
  },
});

function buildBoard(): void {
  board.build(objects, new Set(settings.hidden));
  router.setObjects(board.controllers);
}
buildBoard();

// ---------- Session ----------
const session = new Session({
  board,
  router,
  audio,
  log,
  cfg: boardCfg,
  cover: document.getElementById('cover') as HTMLElement,
  sessionMs: () => debug.sessionMs ?? (settings.sessionMinutes === null ? null : settings.sessionMinutes * 60_000),
  windDownMs: debug.windDownMs ?? boardCfg.windDownMs,
  idleHintMs: debug.idleHintMs ?? boardCfg.idleHintMs,
  canHint: () => views.view === 'board',
  onScreen: (screen) => {
    if (screen === 'play') {
      // Every session starts on the chooser.
      openedAt = performance.now();
      show('chooser');
    } else {
      // The doors close over whatever she was doing. A drawing stays in view, saved and inert.
      closeColoring();
    }
    syncRouter();
    if (screen !== 'play') maybeApplyUpdate();
  },
});

document.documentElement.style.setProperty('--wind', `${debug.windDownMs ?? boardCfg.windDownMs}ms`);

// ---------- Parent gate and settings ----------
let rebuildNeeded = false;
const panel = new ParentPanel({
  el: document.getElementById('parent') as HTMLElement,
  objects,
  cfg: settingsConfig,
  log,
  settings: () => settings,
  onChange(next) {
    rebuildNeeded ||= next.hidden.join() !== settings.hidden.join();
    settings = next;
    saveSettings(settings);
  },
  onVolume(level) {
    audio.unlock();
    audio.setVolume(settingsConfig.volumeLevels[level]);
    audio.playAny(boardCfg.coverOpen.sounds);
  },
  onResume: () => closePanel(),
  onNewSession() {
    if (session.screen === 'play') {
      log.log('board', 'sessionEnd', 'parent');
      void log.flush();
    }
    rebuildNeeded = true;
    closePanel();
    session.showCover();
  },
});

function closePanel(): void {
  panel.close();
  if (rebuildNeeded) {
    rebuildNeeded = false;
    buildBoard();
    session.rebuilt();
  }
  session.resume();
  maybeApplyUpdate();
}

setupGate(document.getElementById('gate') as HTMLButtonElement, debug.gateHoldMs ?? boardCfg.gateHoldMs, () => {
  if (panel.isOpen) return;
  session.pause();
  panel.open(session.screen === 'play');
});

// ---------- Leaving the app ----------
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    router.releaseAll();
    void log.flush();
    void coloring.flush();
  }
});
window.addEventListener('pagehide', () => {
  void log.flush();
  void coloring.flush();
});

// ---------- Errors never stop play: a failing coloring screen goes back to the animals ----------
let lastRecovery = 0;
function recover(): void {
  const now = Date.now();
  if (now - lastRecovery < 2000) return; // avoid loops if the picker itself is failing
  lastRecovery = now;
  try {
    if (views.view === 'coloring' && session.screen === 'play') goPicker();
    else if (views.view === 'picker') picker.refreshAll();
  } catch {
    // nothing more we can safely do
  }
}
window.addEventListener('error', (e) => {
  console.warn('[busy-board]', e.message);
  recover();
});
window.addEventListener('unhandledrejection', (e) => {
  console.warn('[busy-board]', e.reason);
  recover();
});

// ---------- Offline + updates: only when the doors are closed, no parent panel is open and the drawing is saved ----------
initPwa(() => session.screen !== 'play' && !panel.isOpen && coloring.isSaved());

session.start();

void (async () => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported; the log and drawings still save, just without the persistence guarantee
  }
})();
