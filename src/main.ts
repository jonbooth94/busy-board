import './style.css';
import { AudioEngine } from './audio/engine';
import { Board } from './board';
import { board as boardCfg, objects, settingsConfig } from './config';
import type { Settings } from './config/types';
import { TouchRouter } from './engine/router';
import { EventLog } from './log';
import { setupGate } from './parent/gate';
import { ParentPanel } from './parent/panel';
import { initPwa, maybeApplyUpdate } from './pwa';
import { Session } from './session';
import { loadDebug, loadSettings, saveSettings } from './settings';

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

// ---------- Board ----------
const log = new EventLog();
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
  onScreen: (screen) => {
    if (screen !== 'play') maybeApplyUpdate();
  },
});

boardEl.style.setProperty('--wind', `${debug.windDownMs ?? boardCfg.windDownMs}ms`);

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
  }
});
window.addEventListener('pagehide', () => void log.flush());

// ---------- Errors never stop play ----------
window.addEventListener('error', (e) => console.warn('[busy-board]', e.message));
window.addEventListener('unhandledrejection', (e) => console.warn('[busy-board]', e.reason));

// ---------- Offline + updates: only when the board is closed and no parent panel is open ----------
initPwa(() => session.screen !== 'play' && !panel.isOpen);

session.start();

void (async () => {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported; the log still saves, just without the persistence guarantee
  }
})();
