'use client';

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * A modal dialog: dimmed backdrop, a panel in front of it, and the focus
 * contract that makes an overlay usable without a mouse (NFR-A11Y-1, 2).
 *
 * This is the first thing in the system that takes focus away from the page,
 * and SRS §8.3 makes its behaviour the general contract every later overlay
 * inherits, so the whole of it lives here rather than in the one section that
 * currently opens it:
 *
 *   - Tab and Shift+Tab cycle only inside the panel, wrapping at both ends.
 *   - Focus lands on the close button when it opens.
 *   - Focus returns to whatever opened it when it closes.
 *   - Escape closes it, listened for on the document in the capture phase so
 *     it works wherever focus happens to be.
 *   - The page behind it cannot scroll, and gets its scroll back afterwards.
 *
 * The panel is rendered into `document.body` through a portal. Nothing on this
 * page would trap a `fixed` child today, but a dialog that can be opened from
 * anywhere should not depend on the stacking context of wherever it was
 * mounted.
 *
 * Structure is fixed — header row, scrolling body, optional footer row — and
 * content is the caller's. That split is deliberate: the parts that must not
 * vary (the close control, the ARIA wiring, the scroll region) are here, and
 * the parts that differ per use are props.
 */

/*
 * Read on every Tab rather than cached: the dialog's content can swap while it
 * is open, and a stale node list would trap focus against elements that are no
 * longer in the document.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Id of the heading that names the dialog. Rendered inside `header`. */
  labelledBy: string;
  /**
   * Focused when the dialog closes — the control that opened it.
   *
   * Passed as a ref rather than read from `document.activeElement` on open:
   * Safari does not focus a button when it is clicked, so the element that
   * opened the dialog is not reliably the active one by the time it appears.
   */
  returnFocusTo?: RefObject<HTMLElement | null>;
  /** Accessible name for the close control. */
  closeLabel: string;
  /** Sits opposite the close button. Must contain the `labelledBy` heading. */
  header: ReactNode;
  /** Pinned below the scroll region. Omitted entirely when absent. */
  footer?: ReactNode;
  children?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  labelledBy,
  returnFocusTo,
  closeLabel,
  header,
  footer,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Escape, and the focus trap. Capture phase, so neither depends on the event
     reaching the dialog — focus may legitimately be on <body>. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      /* An element with no box cannot be focused by tabbing to it. Checking
         offsets rather than styles keeps this cheap and catches the common
         case — something inside a collapsed or hidden region. */
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetWidth > 0 || node.offsetHeight > 0);

      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      /* Focus escaping the panel entirely is pulled back to the near end,
         which is also what happens on the first Tab after opening. */
      const inside = panel.contains(active);

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  /* Scroll lock. The previous value is restored rather than cleared, so a
     dialog opened over an already-locked page does not unlock it. */
  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  /* Focus in, then back out again. Keyed on `open` alone, so content swapping
     inside an open dialog neither re-focuses the close button nor returns
     focus to the page. */
  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    return () => {
      returnFocusTo?.current?.focus();
    };
  }, [open, returnFocusTo]);

  if (!open) return null;

  return createPortal(
    /*
     * The backdrop closes on click. The panel stops the click going any
     * further, so a click that lands anywhere on the dialog itself — including
     * its padding — is not read as a click outside it.
     */
    <div
      onClick={onClose}
      className="fixed inset-0 z-overlay flex items-center justify-center bg-overlay p-overlay-pad"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-dialog w-full max-w-dialog min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface text-text shadow-overlay"
      >
        <header className="flex flex-none items-start justify-between gap-12 border-b border-border px-dialog-x py-dialog-y">
          <div className="min-w-0">{header}</div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            /* 44×44 exactly, which is the tap-target floor rather than a
               visual choice — the glyph inside is much smaller. */
            className="flex h-tap w-tap flex-none cursor-pointer items-center justify-center rounded-sm border border-border bg-bg font-sans text-subheading leading-none text-text hover:border-text"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        {/* `min-h-0` is what lets this shrink below its content and scroll,
            rather than pushing the footer out of the panel. */}
        <div className="dialog-scroll flex min-h-0 flex-1 flex-col gap-dialog-gap overflow-y-auto overflow-x-hidden overscroll-contain p-dialog-x">
          {children}
        </div>

        {footer ? (
          <footer className="flex flex-none flex-wrap items-center gap-x-12 gap-y-10 border-t border-border px-dialog-x py-dialog-foot">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
