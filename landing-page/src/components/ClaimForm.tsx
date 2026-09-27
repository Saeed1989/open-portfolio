// Slug field + Claim button, used by the hero and the closing CTA.
// Validates format only and hands the slug to the admin host, where availability
// is checked behind a session (SRS §7.2); it holds no reserved list (FR-DAT-1).
import { useState, type FormEvent } from 'react';
import { copy } from '../content/copy';
import { normalizeSlug, SLUG_MAX_LENGTH, validateSlug } from '../lib/slug';
import { Button, type ButtonSize } from './ui/Button';
import { SlugInput } from './ui/SlugInput';

interface ClaimFormProps {
  id?: string;
  size: ButtonSize & ('md' | 'lg');
  className?: string;
}

export function ClaimForm({ id, size, className }: ClaimFormProps) {
  const [slug, setSlug] = useState('');
  const error = slug === '' ? null : validateSlug(slug);
  const ready = slug !== '' && error === null;
  // "too short" is what every slug is while it is being typed; the hint covers it.
  const showError = error !== null && error !== 'too-short';
  const { messages } = copy.claim;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams({ [copy.links.slugParam]: slug });
    window.location.assign(`${copy.links.signIn}?${query.toString()}`);
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      noValidate
      className={['flex flex-col gap-2.5 sm:flex-row sm:items-start', className]
        .filter(Boolean)
        .join(' ')}
    >
      <SlugInput
        label={copy.claim.inputLabel}
        suffix={copy.domain.suffix}
        placeholder={copy.claim.placeholder}
        value={slug}
        onChange={(raw) => setSlug(normalizeSlug(raw))}
        maxLength={SLUG_MAX_LENGTH}
        state={showError ? 'invalid' : 'idle'}
        message={showError ? messages[error] : ready ? messages.ready : messages.idle}
        size={size}
        className="min-w-0 flex-1"
      />
      <Button type="submit" size={size} disabled={!ready} className="w-full sm:w-auto">
        {copy.claim.submit}
      </Button>
    </form>
  );
}
