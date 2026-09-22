import { describe, expect, test } from 'vitest';
import {
  backoffMs,
  hasUnsavedWork,
  INITIAL,
  isSaving,
  reduce,
  type SaveEvent,
  type SaveState,
} from './machine';

/*
 * Every transition of D2's machine.
 *
 * The reducer is pure, so this suite needs no DOM, no timers and no network —
 * which is the reason the scheduling was kept out of it.
 */

const run = (events: readonly SaveEvent[], from: SaveState = INITIAL) =>
  events.reduce(reduce, from);

describe('the happy path', () => {
  test('idle to saving to saved', () => {
    const edited = reduce(INITIAL, { type: 'edit' });
    expect(edited.status).toBe('idle');
    expect(edited.dirty).toBe(true);

    const saving = reduce(edited, { type: 'saveStarted' });
    expect(saving.status).toBe('saving');
    /* The edits are in flight, so the buffer is clean. */
    expect(saving.dirty).toBe(false);
    expect(isSaving(saving)).toBe(true);

    const saved = reduce(saving, { type: 'saveSucceeded', at: 1000 });
    expect(saved.status).toBe('saved');
    expect(saved.savedAt).toBe(1000);
    expect(saved.lastSavedAt).toBe(1000);
    expect(saved.attempt).toBe(0);
    expect(hasUnsavedWork(saved)).toBe(false);
  });

  test('typing during an in-flight save leaves the section dirty again', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'edit' },
    ]);
    expect(state.status).toBe('saving');
    expect(state.dirty).toBe(true);
  });
});

describe('failed — network or 5xx', () => {
  test('keeps the edits and schedules a backoff', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveFailed', kind: 'retryable', message: 'offline' },
    ]);
    expect(state.status).toBe('failed');
    /* The write did not land, so what the tenant typed is pending again —
       a failure may never silently drop it. */
    expect(state.dirty).toBe(true);
    expect(state.attempt).toBe(1);
    expect(state.retryDelayMs).toBe(1000);
    expect(hasUnsavedWork(state)).toBe(true);
  });

  test('backoff grows and is capped', () => {
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(3)).toBe(4000);
    expect(backoffMs(4)).toBe(8000);
    expect(backoffMs(20)).toBe(30_000);
  });

  test('repeated failures escalate the delay', () => {
    let state = run([{ type: 'edit' }, { type: 'saveStarted' }]);
    for (const expected of [1000, 2000, 4000]) {
      state = reduce(state, {
        type: 'saveFailed',
        kind: 'retryable',
        message: 'offline',
      });
      expect(state.retryDelayMs).toBe(expected);
      state = reduce(state, { type: 'retry' });
    }
  });

  test('a success after failures resets the attempt count', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveFailed', kind: 'retryable', message: 'offline' },
      { type: 'retry' },
      { type: 'saveSucceeded', at: 2000 },
    ]);
    expect(state.status).toBe('saved');
    expect(state.attempt).toBe(0);
    expect(state.retryDelayMs).toBeUndefined();
  });

  test('the last successful save survives a later failure', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveSucceeded', at: 1000 },
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveFailed', kind: 'retryable', message: 'offline' },
    ]);
    expect(state.status).toBe('failed');
    expect(state.lastSavedAt).toBe(1000);
  });
});

describe('refused — a save-time content rule', () => {
  test('carries field errors and offers no retry', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      {
        type: 'saveFailed',
        kind: 'refused',
        message: 'Impact cannot be saved empty.',
        fields: [{ path: 'impact', message: 'State what changed.' }],
      },
    ]);
    expect(state.status).toBe('refused');
    expect(state.fields).toHaveLength(1);
    /* Nothing to retry — no backoff is scheduled. */
    expect(state.retryDelayMs).toBeUndefined();
    expect(state.attempt).toBe(0);
  });

  test('editing clears the refusal, because changing it is the only move', () => {
    const refused = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveSucceeded', at: 500 },
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveFailed', kind: 'refused', message: 'no', fields: [] },
    ]);
    const edited = reduce(refused, { type: 'edit' });
    expect(edited.status).toBe('saved');
    expect(edited.savedAt).toBe(500);
    expect(edited.fields).toEqual([]);
    expect(edited.dirty).toBe(true);
  });

  test('dismiss returns to idle when nothing was ever saved', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      { type: 'saveFailed', kind: 'refused', message: 'no', fields: [] },
      { type: 'dismiss' },
    ]);
    expect(state.status).toBe('idle');
  });
});

describe('stale — D3', () => {
  test('holds the server copy and keeps the local edits pending', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      {
        type: 'saveFailed',
        kind: 'stale',
        message: 'changed elsewhere',
        stale: { current: { version: 9 }, currentVersion: 9 },
      },
    ]);
    expect(state.status).toBe('stale');
    expect(state.stale?.currentVersion).toBe(9);
    /* Neither copy is discarded: the local edits are still pending. */
    expect(state.dirty).toBe(true);
    expect(hasUnsavedWork(state)).toBe(true);
  });

  test('resolving takes up the server version and clears the snapshot', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      {
        type: 'saveFailed',
        kind: 'stale',
        message: 'changed elsewhere',
        stale: { current: {}, currentVersion: 9 },
      },
      { type: 'staleResolved', at: 3000 },
    ]);
    expect(state.status).toBe('saved');
    expect(state.stale).toBeUndefined();
    expect(state.savedAt).toBe(3000);
  });

  test('a stale write never silently overwrites — no auto retry is scheduled', () => {
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      {
        type: 'saveFailed',
        kind: 'stale',
        message: 'changed elsewhere',
        stale: { current: {}, currentVersion: 9 },
      },
    ]);
    expect(state.retryDelayMs).toBeUndefined();
  });
});

describe('every status is reachable', () => {
  test('all seven', () => {
    const reached = new Set<string>();
    reached.add(INITIAL.status);
    reached.add(reduce(INITIAL, { type: 'saveStarted' }).status);
    reached.add(
      run([{ type: 'saveStarted' }, { type: 'saveSucceeded', at: 1 }]).status,
    );
    reached.add(
      run([
        { type: 'saveStarted' },
        { type: 'saveFailed', kind: 'retryable', message: '' },
      ]).status,
    );
    reached.add(
      run([
        { type: 'saveStarted' },
        { type: 'saveFailed', kind: 'refused', message: '' },
      ]).status,
    );
    reached.add(
      run([
        { type: 'saveStarted' },
        { type: 'saveFailed', kind: 'stale', message: '' },
      ]).status,
    );
    reached.add(
      run([
        { type: 'saveStarted' },
        { type: 'saveFailed', kind: 'unsupported', message: '' },
      ]).status,
    );

    expect([...reached].sort()).toEqual([
      'failed',
      'idle',
      'refused',
      'saved',
      'saving',
      'stale',
      'unsupported',
    ]);
  });
});

describe('unsupported — the server does not implement this write', () => {
  test('holds the edits and schedules no retry', () => {
    /* Every admin write on the current api answers 501
       (NotImplementedException), so this is the state a real save reaches
       today. Treating it as retryable meant retrying forever. */
    const state = run([
      { type: 'edit' },
      { type: 'saveStarted' },
      {
        type: 'saveFailed',
        kind: 'unsupported',
        message: 'Not Implemented',
      },
    ]);
    expect(state.status).toBe('unsupported');
    expect(state.retryDelayMs).toBeUndefined();
    expect(state.attempt).toBe(0);
    /* The tenant's work is not at fault and is not discarded. */
    expect(state.dirty).toBe(true);
    expect(hasUnsavedWork(state)).toBe(true);
  });

  test('does not escalate a backoff across repeats', () => {
    let state = run([{ type: 'edit' }, { type: 'saveStarted' }]);
    for (let i = 0; i < 3; i += 1) {
      state = reduce(state, {
        type: 'saveFailed',
        kind: 'unsupported',
        message: 'Not Implemented',
      });
      expect(state.retryDelayMs).toBeUndefined();
      expect(state.attempt).toBe(0);
    }
  });
});
