import { Pill } from '../ui/primitives';
import { FieldMatrix } from './FieldMatrix';

/*
 * /dev/fields — the living reference the rest of the build is checked against.
 *
 * Light and dark side by side on one page, because the thing that goes wrong
 * is a token that was only ever looked at in one of them. The dark half is a
 * `.dark` container rather than a second document: the token file redeclares
 * its custom properties under that class, so a subtree gets the dark values
 * with no `dark:` variant on any component.
 */
export function DevFields() {
  return (
    <div className="min-h-screen bg-bg px-[24px] py-[20px]">
      <header className="mb-[20px] flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-baseline gap-[10px]">
          <h1 className="m-0 font-sans text-[17px] font-semibold leading-[1.3] text-ink">
            Field system
          </h1>
          <p className="m-0 font-sans text-[12px] leading-[1.5] text-ink2">
            Eleven components, seven states, one invalid treatment and one focus
            ring. Light and dark are the same components under two token sets.
          </p>
        </div>
      </header>

      {/* The matrix is this page's main content, and a document with none is
          one a screen-reader user cannot skip the header of. */}
      <main className="grid grid-cols-1 gap-[20px] xl:grid-cols-2">
        <ThemeHalf label="Light" />
        <ThemeHalf label="Dark" dark />
      </main>
    </div>
  );
}

function ThemeHalf({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <section
      aria-labelledby={`${label}-theme`}
      className={`${dark ? 'dark' : ''} rounded-card border border-line bg-bg p-[18px]`}
    >
      {/* An h2 rather than a styled span: the component headings below are
          h3, and a page that jumps h1 to h3 is one a screen reader reads as
          having a level missing. */}
      <h2
        id={`${label}-theme`}
        className="mb-[16px] flex items-center gap-[8px]"
      >
        <Pill tone={dark ? 'neutral' : 'accent'}>{label} theme</Pill>
      </h2>
      <FieldMatrix idPrefix={dark ? 'dark' : 'light'} />
    </section>
  );
}
