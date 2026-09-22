import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { adminApi } from '../api/client';
import { AdminError } from '../api/errors';
import { classify, useSectionSave } from './useSectionSave';

/*
 * The scheduling half of D2: the debounce, the backoff, the flushes.
 *
 * Fake timers throughout, because every assertion here is about *when* a write
 * is sent, and a test that waits 800 ms of wall clock to find out is a test
 * nobody runs.
 *
 * `waitFor` is deliberately not used. Testing Library detects Jest's fake
 * timers and not Vitest's, so it polls against a clock that never moves and
 * hangs. `advanceTimersByTimeAsync` moves the clock and drains the microtask
 * queue, which is what makes the awaited fetch resolve — so every wait below
 * is an explicit advance.
 */

/** Advance the clock and let the promises it released settle. */
async function tick(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const updateSection = vi.spyOn(adminApi, 'updateSection');

function portfolio(version: number) {
  return { version } as Awaited<ReturnType<typeof adminApi.updateSection>>;
}

beforeEach(() => {
  vi.useFakeTimers();
  updateSection.mockReset();
  updateSection.mockResolvedValue(portfolio(5));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('debounce', () => {
  test('one write, 800 ms after the last edit', async () => {
    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    await tick(700);
    expect(updateSection).not.toHaveBeenCalled();

    await tick(100);
    expect(updateSection).toHaveBeenCalledTimes(1);
  });

  test('keystrokes restart the timer rather than queueing writes', async () => {
    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    for (const value of [1, 2, 3]) {
      act(() => {
        result.current.edit({ a: value });
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
    }
    expect(updateSection).not.toHaveBeenCalled();

    await tick(800);
    expect(updateSection).toHaveBeenCalledTimes(1);
    /* The last value wins — not three writes, and not the first one. */
    expect(updateSection.mock.calls[0]?.[1]).toEqual({ content: { a: 3 } });
  });

  test('flush sends immediately, without waiting out the debounce', async () => {
    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    act(() => {
      result.current.flush();
    });
    await tick(0);

    expect(updateSection).toHaveBeenCalledTimes(1);
  });
});

describe('the precondition', () => {
  test('the write carries the version it was composed against (D3)', async () => {
    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    await tick(800);

    expect(updateSection).toHaveBeenCalledWith('invented', { content: { a: 1 } }, 4);
  });

  test('the next write uses the version the server returned', async () => {
    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    await tick(800);
    expect(result.current.state.status).toBe('saved');

    updateSection.mockResolvedValue(portfolio(6));
    act(() => {
      result.current.edit({ a: 2 });
    });
    await tick(800);

    expect(updateSection).toHaveBeenLastCalledWith(
        'invented',
        { content: { a: 2 } },
        5,
      );
  });
});

describe('failure handling', () => {
  test('a 5xx retries automatically after the backoff', async () => {
    updateSection.mockRejectedValue(
      new AdminError({ kind: 'server', status: 500, message: 'boom' }),
    );

    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    await tick(800);
    expect(result.current.state.status).toBe('failed');
    expect(updateSection).toHaveBeenCalledTimes(1);

    await tick(1000);
    expect(updateSection.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('the local edits survive a failure and are still readable', async () => {
    updateSection.mockRejectedValue(
      new AdminError({ kind: 'network', status: 0, message: 'offline' }),
    );

    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ typed: 'do not lose me' });
    });
    await tick(800);
    expect(result.current.state.status).toBe('failed');

    expect(result.current.pendingContent()).toEqual({ typed: 'do not lose me' });
  });

  test('a refusal schedules no retry', async () => {
    updateSection.mockRejectedValue(
      new AdminError({
        kind: 'validation',
        status: 422,
        message: 'refused',
        fields: [{ path: 'impact', message: 'cannot be empty' }],
      }),
    );

    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ a: 1 });
    });
    await tick(800);
    expect(result.current.state.status).toBe('refused');

    const callsAtRefusal = updateSection.mock.calls.length;
    await tick(30_000);
    expect(updateSection.mock.calls.length).toBe(callsAtRefusal);
    expect(result.current.state.fields).toHaveLength(1);
  });

  test('a stale write neither retries nor overwrites', async () => {
    updateSection.mockRejectedValue(
      new AdminError({
        kind: 'stale_write',
        status: 409,
        message: 'changed elsewhere',
        code: 'stale_write',
        payload: { current: { version: 11 } },
      }),
    );

    const { result } = renderHook(() =>
      useSectionSave({ type: 'invented', version: 4 }),
    );

    act(() => {
      result.current.edit({ mine: true });
    });
    await tick(800);
    expect(result.current.state.status).toBe('stale');

    expect(result.current.state.stale?.currentVersion).toBe(11);

    const callsAtStale = updateSection.mock.calls.length;
    await tick(30_000);
    expect(updateSection.mock.calls.length).toBe(callsAtStale);
    /* And the tenant's own edits are still here to be copied. */
    expect(result.current.pendingContent()).toEqual({ mine: true });
  });
});

describe('classify', () => {
  test('maps each transport failure onto the machine s three', () => {
    expect(
      classify(new AdminError({ kind: 'stale_write', status: 409, message: '' })),
    ).toBe('stale');
    expect(
      classify(new AdminError({ kind: 'validation', status: 422, message: '' })),
    ).toBe('refused');
    expect(
      classify(new AdminError({ kind: 'server', status: 500, message: '' })),
    ).toBe('retryable');
    expect(
      classify(new AdminError({ kind: 'network', status: 0, message: '' })),
    ).toBe('retryable');
    /* Anything that is not an AdminError is a bug, and a bug is retryable
       rather than a state the tenant has to resolve. */
    expect(classify(new Error('unknown'))).toBe('retryable');
  });
});
