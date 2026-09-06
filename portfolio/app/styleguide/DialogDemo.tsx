'use client';

import { useRef, useState } from 'react';
import { Button, Dialog, Heading, RichText, Text } from '@/components/ui';

/**
 * Dialog in the gallery.
 *
 * A dialog cannot be shown standing still — the whole of it is what happens on
 * open and on close — so this is the one specimen that needs state, and the
 * only client component here besides the theme toggle. Open it and check the
 * contract by hand: focus lands on the close button, Tab does not leave the
 * panel, Escape and the backdrop both close it, the page behind does not
 * scroll, and focus comes back to the trigger.
 */
const SAMPLE =
  '<p>Rich text renders <strong>here</strong>, through the same path a case-study body takes.</p><ul><li>Paragraphs and lists</li><li><em>Emphasis</em> and <u>underline</u></li></ul>';

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  /* Captured from the click, as the project grid does — see Dialog's
     `returnFocusTo` for why not `document.activeElement`. */
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        onClick={(event) => {
          triggerRef.current = event.currentTarget;
          setOpen(true);
        }}
      >
        Open dialog
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="styleguide-dialog-title"
        returnFocusTo={triggerRef}
        closeLabel="Close case study"
        header={
          <>
            <Text variant="label" as="p" tone="muted" className="mb-6">
              Case study · Frontend · 2025
            </Text>
            <Heading level={2} id="styleguide-dialog-title">
              A dialog
            </Heading>
          </>
        }
        footer={
          <>
            <Button href="#" variant="primary">
              Live demo
            </Button>
            <Button href="#" variant="secondary">
              Source
            </Button>
          </>
        }
      >
        <RichText html={SAMPLE} />
        <Text variant="caption" tone="muted">
          Tab from here: focus wraps to the close button rather than reaching
          the page behind.
        </Text>
      </Dialog>
    </>
  );
}
