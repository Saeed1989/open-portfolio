/**
 * The shape of each section type's content.
 *
 * These mirror the field descriptors in `descriptors.ts` one for one. The
 * descriptors are the runtime source of truth — admin builds forms from them,
 * the api validates against them, and the portfolio derives render order from
 * them. These interfaces exist so TypeScript consumers get the same guarantees
 * at compile time.
 */

/** A stored image. `alt` is non-optional: FR-MED-5 enforces it at upload. */
export interface ImageRef {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

/** FR-SEC-HERO-2: a typed choice, not a free-form button. */
export type CtaKind = 'resume' | 'schedule' | 'url';

export interface Cta {
  readonly kind: CtaKind;
  readonly label: string;
  readonly href: string;
}

export interface HeroContent {
  readonly name: string;
  readonly title: string;
  readonly tagline?: string;
  readonly bio?: string;
  /** First entry renders as the primary treatment (FR-SEC-HERO-1). */
  readonly ctas?: readonly Cta[];
  /** Absent means the layout reflows, never a gap (FR-SEC-HERO-3). */
  readonly avatar?: ImageRef | null;
}

export interface ProjectItem {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly year?: string;
  readonly screenshot?: ImageRef | null;
  readonly problem: string;
  readonly impact: string;
  readonly stack?: readonly string[];
  readonly solution?: string;
  readonly role?: string;
  readonly demoUrl?: string;
  readonly repoUrl?: string;
  /** FR-SEC-PROJ-4: suppresses the repo-link requirement, shows a note. */
  readonly confidential?: boolean;
}

export interface ProjectsContent {
  readonly items: readonly ProjectItem[];
  /** Tenant-editable filter categories (FR-SEC-PROJ-7). */
  readonly categories?: readonly string[];
}

/** FR-SEC-SKILL-1: stored once, both tiers derive from this single row. */
export interface SkillItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  /** 1–10. */
  readonly rating: number;
  readonly prominent?: boolean;
  readonly order?: number;
}

export interface SkillsContent {
  readonly items: readonly SkillItem[];
  /** Tenant-editable. A category with no skills is not rendered. */
  readonly categories: readonly string[];
  /** Optional published rating scale (FR-SEC-SKILL-10). */
  readonly legend?: string;
}

export interface ContactLink {
  readonly label: string;
  readonly value: string;
  readonly href: string;
  /** Independent per-link toggle (FR-SEC-CON-2). */
  readonly visible: boolean;
}

export interface ContactContent {
  readonly intro?: string;
  readonly email?: ContactLink;
  readonly github?: ContactLink;
  readonly linkedin?: ContactLink;
  readonly x?: ContactLink;
  readonly site?: ContactLink;
}

export interface ExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly title: string;
  readonly startDate: string;
  /** Omitted or 'Present' for a current role. */
  readonly endDate?: string;
  readonly description?: string;
  readonly accomplishments?: readonly string[];
}

export interface EducationItem {
  readonly id: string;
  readonly degree: string;
  readonly institution: string;
  readonly graduated: string;
  /** Each of the four below is individually hideable (FR-SEC-EDU-1). */
  readonly gpa?: string;
  readonly coursework?: readonly string[];
  readonly scholarships?: readonly string[];
  readonly honours?: readonly string[];
}

export interface BlogPost {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly summary?: string;
  readonly url: string;
}

export interface Testimonial {
  readonly id: string;
  readonly quote: string;
  readonly name: string;
  readonly role?: string;
  readonly company?: string;
  readonly photo?: ImageRef | null;
}

export interface OpenSourceContribution {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly impact?: string;
  readonly url?: string;
}

/**
 * The figures the tenant types in, rendered as text.
 *
 * Stars are deliberately absent: a star count measures attention, not work,
 * and the section is meant to show what the tenant did. Commits and pull
 * requests are the two that do. `commitsLastYear` is a rolling twelve months,
 * which is also the window the embedded card counts over — the two agree
 * rather than inviting the reader to reconcile them.
 */
export interface OpenSourceStats {
  readonly repos?: number;
  readonly commitsLastYear?: number;
  readonly pullRequests?: number;
  readonly contributions?: number;
}

/**
 * The third-party stat cards a tenant may switch on.
 *
 * They are rendered as `<img>` embeds pointed at the card service, so the
 * visitor's browser makes the request and this system makes none — no fetch at
 * render, no worker, no cache entry, no credential (FR-INT-1, NFR-PERF-3).
 */
export const GITHUB_EMBED_CARDS = ['stats', 'languages', 'streak'] as const;

export type GitHubEmbedCard = (typeof GITHUB_EMBED_CARDS)[number];

export interface OpenSourceContent {
  readonly profileUrl?: string;
  readonly stats?: OpenSourceStats;
  readonly contributions?: readonly OpenSourceContribution[];
  /**
   * Bare GitHub login, never a URL. It is interpolated into a third-party URL
   * as a query parameter, percent-encoded at the point of use.
   */
  readonly githubUsername?: string;
  /** Which embeds to draw. Absent means the descriptor's default. */
  readonly embedCards?: readonly GitHubEmbedCard[];
}

export interface SpeakingItem {
  readonly id: string;
  readonly event: string;
  readonly date: string;
  readonly title: string;
  readonly url?: string;
}

export type AchievementType =
  | 'certification'
  | 'award'
  | 'ranking'
  | 'hackathon';

export interface AchievementItem {
  readonly id: string;
  readonly title: string;
  readonly issuer: string;
  readonly date: string;
  readonly type: AchievementType;
  readonly url?: string;
}

export interface GalleryItem {
  readonly id: string;
  readonly image?: ImageRef | null;
  readonly caption?: string;
  /** Embedded video from the provider allowlist (FR-SEC-GAL-1). */
  readonly videoUrl?: string;
}

/** A collection section's content object. */
export interface Collection<T> {
  readonly items: readonly T[];
}

export type ExperienceContent = Collection<ExperienceItem>;
export type EducationContent = Collection<EducationItem>;
export type BlogContent = Collection<BlogPost>;
export type TestimonialsContent = Collection<Testimonial>;
export type SpeakingContent = Collection<SpeakingItem>;
export type AchievementsContent = Collection<AchievementItem>;
export type GalleryContent = Collection<GalleryItem>;

/** Maps a section type to the content object it carries. */
export interface SectionContentMap {
  readonly hero: HeroContent;
  readonly projects: ProjectsContent;
  readonly skills: SkillsContent;
  readonly contact: ContactContent;
  readonly experience: ExperienceContent;
  readonly education: EducationContent;
  readonly blog: BlogContent;
  readonly testimonials: TestimonialsContent;
  readonly opensource: OpenSourceContent;
  readonly speaking: SpeakingContent;
  readonly achievements: AchievementsContent;
  readonly gallery: GalleryContent;
}

/**
 * A section instance whose `content` is correlated with its `type`.
 *
 * `SectionInstance` in types.ts carries `content: unknown`, which is the
 * honest shape for a document just read out of MongoDB. This is the shape once
 * the type is known — useful wherever content is authored in TypeScript rather
 * than parsed, such as a preset or a test fixture.
 */
export type TypedSectionInstance = {
  [K in keyof SectionContentMap]: {
    readonly type: K;
    readonly enabled: boolean;
    readonly order: number;
    readonly content: SectionContentMap[K];
  };
}[keyof SectionContentMap];
