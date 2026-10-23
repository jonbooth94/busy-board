import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DB_NAME,
  DB_VERSION,
  type LogRow,
  appendEvents,
  clearEvents,
  closeDb,
  countEvents,
  formatSessionId,
  localTimestamp,
  readEvents,
  toCsv,
} from '../../src/log.ts';

const row = (objectId: string, event: LogRow['event'] = 'tap', stateAfter = 'on'): LogRow => ({
  timestamp: '2026-11-02T09:14:31.220',
  sessionId: 's003',
  objectId,
  event,
  stateAfter,
});

describe('CSV export', () => {
  it('has the spec columns in order, one row per event', () => {
    const csv = toCsv([row('light-switch'), row('empty', 'tap', '')]);
    expect(csv).toBe(
      'timestamp,sessionId,objectId,event,stateAfter\r\n' +
        '2026-11-02T09:14:31.220,s003,light-switch,tap,on\r\n' +
        '2026-11-02T09:14:31.220,s003,empty,tap,\r\n',
    );
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    expect(toCsv([row('a,b', 'tap', 'say "hi"')]).split('\r\n')[1]).toBe('2026-11-02T09:14:31.220,s003,"a,b",tap,"say ""hi"""');
  });

  it('formats local timestamps with milliseconds and no zone', () => {
    expect(localTimestamp(new Date(2026, 10, 2, 9, 14, 31, 220))).toBe('2026-11-02T09:14:31.220');
  });

  it('formats session ids like s003', () => {
    expect(formatSessionId(3)).toBe('s003');
    expect(formatSessionId(1234)).toBe('s1234');
  });
});

describe('event storage', () => {
  beforeEach(() => {
    closeDb();
    globalThis.indexedDB = new IDBFactory(); // fresh database per test
  });

  it('starts empty', async () => {
    expect(await readEvents()).toEqual([]);
    expect(await countEvents()).toBe(0);
  });

  it('appends events and reads them back oldest first', async () => {
    await appendEvents([row('a'), row('b')]);
    await appendEvents([row('c')]);
    expect((await readEvents()).map((r) => r.objectId)).toEqual(['a', 'b', 'c']);
    expect(await countEvents()).toBe(3);
  });

  it('keeps events across a reconnect (app restart)', async () => {
    await appendEvents([row('a')]);
    closeDb();
    expect(await countEvents()).toBe(1);
  });

  it('clears the log', async () => {
    await appendEvents([row('a'), row('b')]);
    await clearEvents();
    expect(await countEvents()).toBe(0);
  });

  it('uses a versioned schema', async () => {
    await appendEvents([row('a')]);
    closeDb();
    const version = await new Promise<number>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => {
        resolve(req.result.version);
        req.result.close();
      };
      req.onerror = () => reject(req.error);
    });
    expect(version).toBe(DB_VERSION);
  });
});
