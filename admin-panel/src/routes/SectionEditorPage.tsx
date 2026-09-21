import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { adminApi } from '../api/client';
import { AdminError } from '../api/errors';
import { usePublishAttempted } from '../app-state/publish-attempted-context';
import {
  descriptorFor,
  DESCRIPTORS,
  IS_SHIMMED,
  readiness,
  validateForPublish,
} from '../registry';
import { buildGapMap } from '../renderer/gaps';
import { SectionForm } from '../renderer/SectionForm';
import { SaveIndicator } from '../save/SaveIndicator';
import { useSectionSave } from '../save/useSectionSave';
import { Button, Card, Pill } from '../ui/primitives';

/*
 * One editor page for every section type.
 *
 * It names no section type and branches on none. The `:type` in the URL is
 * looked up in the registry; a descriptor comes back or it does not. That is
 * the whole of FR-REG-3 on this side — a new section type is a registry entry
 * and this page renders it without being touched.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Pulls one section's content out of the draft the admin surface returns. */
function contentFor(portfolio: unknown, type: string): unknown {
  if (!isRecord(portfolio)) return {};
  const draft = portfolio.draft;
  if (!isRecord(draft)) return {};
  /* Typed as `unknown[]` rather than left to `Array.isArray`, which narrows an
     `unknown` to `any[]` and quietly drops every check below it. */
  const sections: readonly unknown[] = Array.isArray(draft.sections)
    ? (draft.sections as unknown[])
    : [];
  const section = sections.find(
    (entry) => isRecord(entry) && entry.type === type,
  );
  return isRecord(section) ? section.content : {};
}

export function SectionEditorPage() {
  const { type } = useParams();
  const descriptor = descriptorFor(type);

  if (!descriptor || type === undefined) {
    return (
      <div className="p-[24px]">
        <h1 className="m-0 font-sans text-[17px] font-semibold text-ink">
          No such section
        </h1>
        <p className="mt-[6px] font-sans text-[12px] text-ink2">
          The registry declares no section of that type.
        </p>
        <nav className="mt-[14px] flex flex-wrap gap-[8px]">
          {DESCRIPTORS.map((entry) => (
            <Link
              key={entry.type}
              to={`/sections/${entry.type}`}
              className="rounded-field border border-line-strong bg-surface px-[11px] py-[6px] font-sans text-[12px] text-ink no-underline"
            >
              {entry.label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  /* Keyed on the type so switching sections remounts: a fresh save machine,
     a fresh debounce, and no chance of one section's pending write landing
     on another's endpoint. */
  return <Editor key={type} type={type} descriptor={descriptor} />;
}

function Editor({
  type,
  descriptor,
}: {
  type: string;
  descriptor: NonNullable<ReturnType<typeof descriptorFor>>;
}) {
  const { attempted, setAttempted } = usePublishAttempted();

  const [content, setContent] = useState<unknown>({});
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const save = useSectionSave({
    type,
    version,
    onVersion: setVersion,
    onServerContent: (next, nextVersion) => {
      setContent(next);
      setVersion(nextVersion);
    },
  });

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(undefined);
    adminApi
      .portfolio()
      .then((portfolio) => {
        setContent(contentFor(portfolio, type));
        setVersion(portfolio.version);
      })
      .catch((cause: unknown) => {
        setLoadError(
          cause instanceof AdminError ? cause.message : String(cause),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [type]);

  useEffect(load, [load]);

  const errors = useMemo(
    () => validateForPublish(descriptor, content),
    [descriptor, content],
  );
  const gaps = useMemo(
    () => buildGapMap(errors, attempted),
    [errors, attempted],
  );
  const stats = useMemo(
    () => readiness(descriptor, content, errors),
    [descriptor, content, errors],
  );

  /* A refused save's field errors are shown on the field immediately, and are
     deliberately not the same thing as a publish gap — one is the server
     saying no to this write, the other is a note about a publish that has not
     happened. */
  const refusedErrors = useMemo(() => {
    const map = new Map<string, string>();
    if (save.state.status !== 'refused') return map;
    for (const field of save.state.fields) map.set(field.path, field.message);
    return map;
  }, [save.state]);

  const onChange = useCallback(
    (next: unknown) => {
      setContent(next);
      save.edit(next);
    },
    [save],
  );

  const copyEdits = () => {
    /* `navigator.clipboard` is typed as always present and is undefined
       outside a secure context, so this reads it defensively in spite of the
       DOM types — losing the tenant's edits because the page was served over
       http is not an acceptable failure. */
    const clipboard = (navigator as Partial<Navigator>).clipboard;
    if (!clipboard) return;
    void clipboard
      .writeText(JSON.stringify(save.pendingContent() ?? content, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      });
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line bg-surface px-[20px] py-[10px]">
        <div className="flex items-center gap-[7px] font-sans text-[12px] text-ink3">
          <Link to="/sections" className="text-ink3 no-underline">
            Sections
          </Link>
          <span>/</span>
          <b className="font-semibold text-ink">{descriptor.label}</b>
          {descriptor.emptyCondition(content) ? (
            <Pill tone="warn">Enabled but empty</Pill>
          ) : (
            <Pill tone="ok">Appears</Pill>
          )}
        </div>
        <SaveIndicator
          state={save.state}
          onRetry={save.retry}
          onDismiss={save.dismiss}
          onCopyEdits={copyEdits}
          onAcceptServer={() => {
            const snapshot = save.state.stale;
            if (!snapshot) return;
            save.acceptServer(
              contentFor(snapshot.current, type),
              snapshot.currentVersion ?? 0,
            );
          }}
        />
      </header>

      {copied ? (
        <p role="status" className="m-0 bg-ok-soft px-[20px] py-[6px] font-sans text-[11.5px] text-ok">
          Your edits are on the clipboard as JSON.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-[20px] p-[20px] xl:grid-cols-[1fr_260px]">
        <main className="flex flex-col gap-[16px]">
          <div>
            <h1 className="m-0 font-sans text-[17px] font-semibold leading-[1.3] text-ink">
              {descriptor.label}
            </h1>
            <p className="mt-[4px] font-sans text-[12px] leading-[1.5] text-ink2">
              {descriptor.description}
            </p>
          </div>

          {loading ? (
            <p className="font-mono text-[11px] text-ink3">Loading…</p>
          ) : loadError !== undefined ? (
            <Card className="flex items-center gap-[10px] p-[12px]">
              <Pill tone="danger">Could not load</Pill>
              <span className="font-sans text-[11.5px] text-ink2">
                {loadError}
              </span>
              <Button sm onClick={load}>
                Try again
              </Button>
            </Card>
          ) : (
            <SectionForm
              descriptor={descriptor}
              content={content}
              gaps={gaps}
              refusedErrors={refusedErrors}
              onChange={onChange}
            />
          )}
        </main>

        <aside className="flex flex-col gap-[12px]">
          {/* The same rail on every section editor. It reads the D4 validator
              and knows nothing about which type it is describing. */}
          <Card className="flex flex-col gap-[6px] p-[12px]">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink3">
              Publish readiness
            </span>
            <div className="flex items-baseline justify-between gap-[12px] border-b border-line py-[7px] font-sans text-[12px]">
              <span className="text-ink2">Fields complete</span>
              <b className="font-medium text-ink">
                {stats.filled} of {stats.total}
              </b>
            </div>
            <div className="flex items-baseline justify-between gap-[12px] py-[7px] font-sans text-[12px]">
              <span className="text-ink2">Blocking publish</span>
              <b
                className={`font-medium ${stats.blocking > 0 ? 'text-warn' : 'text-ink'}`}
              >
                {stats.blocking}
              </b>
            </div>
            {errors[0] ? (
              <p className="m-0 font-sans text-[11.5px] leading-[1.45] text-ink3">
                {errors[0].message}
              </p>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-[8px] p-[12px]">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink3">
              Dev only
            </span>
            {/* Publish is not built in this milestone, so the flag that turns
                pending gaps red has no other way to be set. */}
            <label className="flex items-center gap-[8px] font-sans text-[11.5px] text-ink2">
              <input
                type="checkbox"
                checked={attempted}
                onChange={(event) => {
                  setAttempted(event.target.checked);
                }}
              />
              Publish attempted
            </label>
            <p className="m-0 font-sans text-[11px] leading-[1.45] text-ink3">
              Off: gaps are the grey publish-only marker. On: the same gaps turn
              red, as they would after a failed publish.
            </p>
            {IS_SHIMMED ? (
              <p className="m-0 font-sans text-[11px] leading-[1.45] text-ink3">
                Descriptors come from the temporary shim, not from
                @portfolio/registry.
              </p>
            ) : null}
          </Card>

          <nav className="flex flex-col gap-[4px]">
            {DESCRIPTORS.map((entry) => (
              <Link
                key={entry.type}
                to={`/sections/${entry.type}`}
                className={`rounded-field px-[9px] py-[6px] font-sans text-[12.5px] no-underline ${
                  entry.type === type
                    ? 'bg-accent-soft font-semibold text-accent'
                    : 'text-ink2'
                }`}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
