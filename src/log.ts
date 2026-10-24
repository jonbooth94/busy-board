// Local playtest log. Events stay on the device in IndexedDB and export as CSV from the
// parent panel. Bump DB_VERSION and add a migration step in upgrade() whenever the schema
// changes; existing events must be carried forward.

export const DB_NAME = 'busy-board';
export const DB_VERSION = 1;
const STORE = 'events';

/**
 * The spec's events, plus session markers so time-to-first-tap and wind-down can be measured,
 * plus "navigate" (objectId "app") each time the view changes, e.g. stateAfter "picker" or "coloring:dog".
 */
export type EventName = 'tap' | 'drag' | 'ignoredCooldown' | 'idleHint' | 'sessionStart' | 'windDown' | 'sessionEnd' | 'navigate';

export interface LogRow {
  timestamp: string;
  sessionId: string;
  /** An object id, "empty" for taps on empty board space, "board" for session markers, or "app" for navigation. */
  objectId: string;
  event: EventName;
  stateAfter: string;
}

export const CSV_COLUMNS = ['timestamp', 'sessionId', 'objectId', 'event', 'stateAfter'] as const;

/** Local time with milliseconds and no zone, e.g. 2026-11-02T09:14:31.220 (what spreadsheets expect). */
export function localTimestamp(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: readonly LogRow[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function formatSessionId(n: number): string {
  return `s${String(n).padStart(3, '0')}`;
}

// ---------- IndexedDB ----------

let dbPromise: Promise<IDBDatabase> | null = null;

function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(STORE, { autoIncrement: true });
  }
  // Future: if (oldVersion < 2) { ... migrate ... }
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion);
    req.onsuccess = () => {
      const db = req.result;
      // Let a newer app version upgrade the schema without being blocked by this tab.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function appendEvents(rows: readonly LogRow[]): Promise<void> {
  if (!rows.length) return;
  await run('readwrite', (s) => {
    for (const r of rows) s.add(r);
  });
}

/** All events, oldest first. */
export async function readEvents(): Promise<LogRow[]> {
  return (await run<LogRow[]>('readonly', (s) => s.getAll() as IDBRequest<LogRow[]>)) ?? [];
}

export async function countEvents(): Promise<number> {
  return (await run<number>('readonly', (s) => s.count())) ?? 0;
}

export async function clearEvents(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}

/** For tests: drop the cached connection. */
export function closeDb(): void {
  void dbPromise?.then((db) => db.close()).catch(() => undefined);
  dbPromise = null;
}

// ---------- Logger used by the game ----------

const COUNTER_KEY = 'bb.sessionCounter';

/** Buffers events and writes them in small batches, so logging never delays a sound. */
export class EventLog {
  sessionId = formatSessionId(0);
  private buffer: LogRow[] = [];
  private timer = 0;
  private chain: Promise<void> = Promise.resolve();

  /** Starts a new session id (s001, s002, ...), persisted across launches. */
  newSession(): string {
    let n: number;
    try {
      n = Number(localStorage.getItem(COUNTER_KEY)) || 0;
      localStorage.setItem(COUNTER_KEY, String(n + 1));
    } catch {
      // storage unavailable: ids still increase within this launch
      n = Number(this.sessionId.slice(1));
    }
    this.sessionId = formatSessionId(n + 1);
    return this.sessionId;
  }

  log(objectId: string, event: EventName, stateAfter = ''): void {
    this.buffer.push({ timestamp: localTimestamp(), sessionId: this.sessionId, objectId, event, stateAfter });
    if (!this.timer) this.timer = window.setTimeout(() => void this.flush(), 400);
  }

  /** Write everything buffered. Safe to call any time (visibilitychange, pagehide, before export). */
  flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = 0;
    const rows = this.buffer;
    this.buffer = [];
    this.chain = this.chain.then(() => appendEvents(rows)).catch(() => undefined);
    return this.chain;
  }
}
