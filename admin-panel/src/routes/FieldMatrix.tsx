import { CELLS, SPECS } from './field-specs';

/*
 * Every field component against every state, as one grid.
 *
 * Laid out as a matrix rather than a gallery for the reason the mock gives
 * for doing the same: a shared treatment shows as a clean column, and a
 * component that draws its own error border or its own focus ring shows as a
 * break in one. That is what makes this a reference rather than a demo.
 */

/**
 * The whole matrix, once.
 *
 * `idPrefix` exists because the page renders this twice, side by side. Two
 * copies sharing an id would break every `htmlFor` and every
 * `aria-describedby` on the second one — and axe would be right to say so.
 */
export function FieldMatrix({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex flex-col gap-[28px]">
      {/* A plain div, not a section: a named <section> is a `region`
          landmark, and eleven of them repeated in each theme would be eleven
          duplicate landmarks. The heading is what structures this page. */}
      {SPECS.map((spec) => (
        <div key={spec.name}>
          <div className="mb-[10px] flex items-baseline gap-[10px] border-b border-line pb-[6px]">
            <h3
              id={`${idPrefix}-${spec.name}`}
              className="font-mono text-[12px] font-semibold text-ink"
            >
              {spec.name}
            </h3>
            <p className="m-0 font-sans text-[11.5px] leading-[1.45] text-ink3">
              {spec.note}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
            {CELLS.map((cell) => (
              <div key={cell.kind} className="flex flex-col gap-[6px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink3">
                  {cell.label}
                </span>
                {spec.render(`${idPrefix}-${spec.name}-${cell.kind}`, cell.kind)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
