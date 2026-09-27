import { Button, Pill } from '../ui/primitives';
import type { SaveState } from './machine';

/*
 * Artboard 39, rendered.
 *
 * "The indicator lives in the top bar beside Publish. It never blocks typing
 * and never opens a dialog — except on failure, where it offers the retry
 * inline." Nothing here is a modal, and nothing here takes focus.
 */

function clock(at: number | undefined): string {
  if (at === undefined) return '';
  return new Date(at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface SaveIndicatorProps {
  readonly state: SaveState;
  readonly onRetry: () => void;
  readonly onDismiss: () => void;
  readonly onCopyEdits: () => void;
  /** Take the server's copy after a stale write. */
  readonly onAcceptServer: () => void;
}

export function SaveIndicator({
  state,
  onRetry,
  onDismiss,
  onCopyEdits,
  onAcceptServer,
}: SaveIndicatorProps) {
  return (
    <div
      /* Polite, not assertive: a save is ambient and must not interrupt
         whatever the tenant is typing into (NFR-A11Y-5). */
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-[10px]"
    >
      {state.status === 'idle' ? (
        <span className="font-mono text-[11px] text-ink3">
          {state.dirty ? 'Unsaved changes' : 'No changes yet'}
        </span>
      ) : null}

      {state.status === 'saving' ? (
        <span className="font-mono text-[11px] text-ink2">Saving…</span>
      ) : null}

      {state.status === 'saved' ? (
        /* A timestamp, not a tick that fades. Shape and type were validated;
           `required` was not, which is why an incomplete draft reads as
           saved (FR-REG-8). */
        <span className="font-mono text-[11px] text-ink2">
          Saved {clock(state.savedAt)}
          {state.dirty ? ' · unsaved changes' : ''}
        </span>
      ) : null}

      {state.status === 'failed' ? (
        <>
          <Pill tone="danger">Save failed</Pill>
          <span className="font-mono text-[11px] text-ink2">
            {state.lastSavedAt === undefined
              ? 'Nothing has been saved yet'
              : `Last successful save ${clock(state.lastSavedAt)}`}
            {state.retryDelayMs === undefined
              ? ''
              : ` · retrying in ${String(Math.round(state.retryDelayMs / 1000))}s`}
          </span>
          <span className="font-sans text-[11.5px] text-ink3">
            Your edits are held in this tab. Do not close it.
          </span>
          <Button sm onClick={onCopyEdits}>
            Copy my edits
          </Button>
          <Button sm variant="primary" onClick={onRetry}>
            Retry now
          </Button>
        </>
      ) : null}

      {state.status === 'refused' ? (
        <>
          {/* The fourth state: the only one where a save is rejected on
              content. Nothing to retry, something to change — so no retry
              control is offered, and the message names the rule. */}
          <Pill tone="danger">Refused</Pill>
          <span className="font-sans text-[11.5px] text-ink2">
            {state.message}
          </span>
          <Button sm onClick={onDismiss}>
            Dismiss
          </Button>
        </>
      ) : null}

      {state.status === 'unsupported' ? (
        <>
          {/* Not a failure the tenant caused or can clear. No retry is
              offered, because nothing about waiting or clicking will make an
              unbuilt endpoint appear. The edits stay in the form and stay
              copyable. */}
          <Pill tone="warn">Not supported yet</Pill>
          <span className="font-sans text-[11.5px] text-ink2">
            This server does not implement saving this section yet. Your edits
            are still here and have not been sent.
          </span>
          <Button sm onClick={onCopyEdits}>
            Copy my edits
          </Button>
        </>
      ) : null}

      {state.status === 'stale' ? (
        <>
          {/* D3. Neither copy is thrown away: the tenant's edits stay in the
              form and stay copyable, and the server's version is taken up
              only on an explicit click. */}
          <Pill tone="warn">Changed elsewhere</Pill>
          <span className="font-sans text-[11.5px] text-ink2">
            This section was saved somewhere else while you were editing. Your
            edits are still here and have not been sent.
          </span>
          <Button sm onClick={onCopyEdits}>
            Copy my edits
          </Button>
          <Button sm variant="primary" onClick={onAcceptServer}>
            Load the other version
          </Button>
        </>
      ) : null}
    </div>
  );
}
