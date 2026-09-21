import { Link } from 'react-router';
import { DESCRIPTORS } from '../registry';
import { Card } from '../ui/primitives';

/*
 * A link list, and deliberately nothing more.
 *
 * The section manager — enable toggles, reorder, the "Appears / Enabled but
 * empty" column — is a screen of its own and is not in this milestone. This
 * exists so `/sections/:type` is reachable without typing a URL.
 */
export function SectionIndexPage() {
  return (
    <div className="min-h-screen bg-bg p-[24px]">
      <h1 className="m-0 font-sans text-[17px] font-semibold leading-[1.3] text-ink">
        Sections
      </h1>
      <p className="mt-[4px] font-sans text-[12px] leading-[1.5] text-ink2">
        Every type the registry declares. One editor renders all of them.
      </p>
      <ul className="mt-[16px] flex list-none flex-col gap-[8px] p-0">
        {DESCRIPTORS.map((descriptor) => (
          <li key={descriptor.type}>
            <Card>
              <Link
                to={`/sections/${descriptor.type}`}
                className="flex items-center gap-[12px] p-[12px] no-underline"
              >
                <span className="font-sans text-[12px] font-semibold text-ink">
                  {descriptor.label}
                </span>
                <span className="font-mono text-[10.5px] text-ink3">
                  {descriptor.cardinality}
                </span>
                <span className="flex-1 font-sans text-[11.5px] text-ink2">
                  {descriptor.description}
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
