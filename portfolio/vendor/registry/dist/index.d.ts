import { S as SectionType, a as SectionDescriptor, b as SectionInstance, F as FieldError } from './types-DjzuMzCj.js';
export { C as CollectionSectionDescriptor, c as FieldDescriptor, d as FieldKind, P as Priority, e as SECTION_TYPES, f as SingleSectionDescriptor } from './types-DjzuMzCj.js';

/**
 * The registry's version. A portfolio records the one it was authored against
 * (`registryVersion`), so a later registry cannot retroactively invalidate it.
 *
 * A bump is additive only: a new section type, optional field, help text, or
 * enum option. A change that could fail an older document needs a migration,
 * not a bump.
 *
 * History:
 *   1  The first twelve section types.
 *   2  Adds `trainings`.
 */
declare const REGISTRY_VERSION = 2;
/** The oldest version this registry can still read without a migration. */
declare const MIN_SUPPORTED_REGISTRY_VERSION = 1;
/**
 * True when a portfolio authored at `version` can be validated and published
 * against this registry. A version from the future cannot: it may carry a
 * section type or field this build does not know.
 */
declare function isSupportedRegistryVersion(version: unknown): boolean;

/**
 * The shape of each section type's content.
 *
 * These mirror the field descriptors in `descriptors.ts` one for one. The
 * descriptors are the runtime source of truth — admin builds forms from them,
 * the api validates against them, and the portfolio derives render order from
 * them. These interfaces exist so TypeScript consumers get the same guarantees
 * at compile time.
 */
/** A stored image. `alt` is required at upload, so it is never optional here. */
interface ImageRef {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
}
/** A typed choice, not a free-form button. */
type CtaKind = 'resume' | 'schedule' | 'url';
interface Cta {
    readonly kind: CtaKind;
    readonly label: string;
    readonly href: string;
}
interface HeroContent {
    readonly name: string;
    readonly title: string;
    readonly tagline?: string;
    readonly bio?: string;
    /** First entry renders as the primary treatment. */
    readonly ctas?: readonly Cta[];
    /** Absent means the layout reflows, never a gap. */
    readonly avatar?: ImageRef | null;
}
/**
 * The three rich-text bodies behind a project's case-study modal. Stored as
 * HTML and injected as-is at render, which is safe only because the write path
 * sanitises them against the allowlist in `sanitize.ts`.
 */
interface ProjectBodies {
    readonly business: string;
    readonly solution: string;
    readonly role: string;
}
/**
 * A project at two depths: card-level fields, then the modal-level case study.
 * The two are stored separately; the card is never a truncation of the modal.
 * Modal-level fields are optional in a draft and required at publish.
 */
interface ProjectItem {
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
    /** Suppresses the repo-link requirement and shows a note instead. */
    readonly confidential?: boolean;
    readonly bodies?: ProjectBodies;
    /** The title held on the engagement, e.g. "Lead front-end engineer". */
    readonly designation?: string;
    /** The subset of `fullStack` the tenant personally touched. */
    readonly stackWorkedOn?: readonly string[];
    /** Non-runtime tooling. Orthogonal to both stack lists, not a subset. */
    readonly tools?: readonly string[];
    /** The project's whole stack, including what the tenant did not work on. */
    readonly fullStack?: readonly string[];
}
interface ProjectsContent {
    readonly items: readonly ProjectItem[];
    /** Tenant-editable filter categories. */
    readonly categories?: readonly string[];
}
/** Stored once; the prominent and detailed tiers both derive from this row. */
interface SkillItem {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    /** 1–10. */
    readonly rating: number;
    readonly prominent?: boolean;
    readonly order?: number;
}
interface SkillsContent {
    readonly items: readonly SkillItem[];
    /** Tenant-editable. A category with no skills is not rendered. */
    readonly categories: readonly string[];
    /** Optional published rating scale. */
    readonly legend?: string;
}
interface ContactLink {
    readonly label: string;
    readonly value: string;
    readonly href: string;
    /** Independent per-link toggle. */
    readonly visible: boolean;
}
interface ContactContent {
    readonly intro?: string;
    readonly email?: ContactLink;
    readonly github?: ContactLink;
    readonly linkedin?: ContactLink;
    readonly x?: ContactLink;
    readonly site?: ContactLink;
}
interface ExperienceItem {
    readonly id: string;
    readonly company: string;
    readonly title: string;
    readonly startDate: string;
    /** Omitted or 'Present' for a current role. */
    readonly endDate?: string;
    readonly description?: string;
    readonly accomplishments?: readonly string[];
}
interface EducationItem {
    readonly id: string;
    readonly degree: string;
    readonly institution: string;
    readonly graduated: string;
    /** Each of the four below is individually hideable. */
    readonly gpa?: string;
    readonly coursework?: readonly string[];
    readonly scholarships?: readonly string[];
    readonly honours?: readonly string[];
}
interface BlogPost {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly summary?: string;
    readonly url: string;
}
interface Testimonial {
    readonly id: string;
    readonly quote: string;
    readonly name: string;
    readonly role?: string;
    readonly company?: string;
    readonly photo?: ImageRef | null;
}
interface OpenSourceContribution {
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
interface OpenSourceStats {
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
 * render, no worker, no cache entry, no credential.
 */
declare const GITHUB_EMBED_CARDS: readonly ["stats", "languages", "streak"];
type GitHubEmbedCard = (typeof GITHUB_EMBED_CARDS)[number];
interface OpenSourceContent {
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
interface SpeakingItem {
    readonly id: string;
    readonly event: string;
    readonly date: string;
    readonly title: string;
    readonly url?: string;
}
type AchievementType = 'certification' | 'award' | 'ranking' | 'hackathon';
/**
 * Where an achievement came from.
 *
 * Credly is a *source* of achievements, not a kind of section: an imported
 * badge is an ordinary item in the one flat `achievements` collection, marked
 * so the page can group it and so a re-import can recognise it. Nothing is
 * nested, and no second collection exists.
 */
type AchievementSource = 'manual' | 'credly';
interface AchievementItem {
    readonly id: string;
    readonly title: string;
    /** Optional to match the descriptor: only `title` is required there. */
    readonly issuer?: string;
    readonly date?: string;
    readonly type: AchievementType;
    readonly url?: string;
    /** Absent means `manual` — the value every item authored by hand takes. */
    readonly source?: AchievementSource;
    /**
     * The badge's UUID only. The pasted embed markup is never stored: injecting
     * tenant HTML at render would be stored XSS, so the render path builds the
     * embed element from this value.
     */
    readonly credlyBadgeId?: string;
    /** Public verification page. Restricted to Credly's own hosts. */
    readonly verifyUrl?: string;
}
/**
 * A completed course, workshop, bootcamp or structured programme. Field for
 * field an achievement, minus the Credly fields and the per-item publish flag,
 * so a credential can be filed as either one. `type` deliberately reuses
 * `AchievementType`, although its values fit a training poorly.
 */
interface TrainingItem {
    readonly id: string;
    readonly title: string;
    readonly issuer?: string;
    readonly date?: string;
    readonly type: AchievementType;
    readonly url?: string;
}
interface GalleryItem {
    readonly id: string;
    readonly image?: ImageRef | null;
    readonly caption?: string;
    /** Embedded video from the provider allowlist. */
    readonly videoUrl?: string;
}
/** A collection section's content object. */
interface Collection<T> {
    readonly items: readonly T[];
}
type ExperienceContent = Collection<ExperienceItem>;
type EducationContent = Collection<EducationItem>;
type BlogContent = Collection<BlogPost>;
type TestimonialsContent = Collection<Testimonial>;
type SpeakingContent = Collection<SpeakingItem>;
interface AchievementsContent {
    readonly items: readonly AchievementItem[];
    /**
     * Used once, on explicit tenant action, to populate items from a public
     * Credly wallet. Not a connection: no credential, schedule, or cache.
     */
    readonly credlyUsername?: string;
}
type TrainingsContent = Collection<TrainingItem>;
type GalleryContent = Collection<GalleryItem>;
/** Maps a section type to the content object it carries. */
interface SectionContentMap {
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
    readonly trainings: TrainingsContent;
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
type TypedSectionInstance = {
    [K in keyof SectionContentMap]: {
        readonly type: K;
        readonly enabled: boolean;
        readonly order: number;
        readonly content: SectionContentMap[K];
    };
}[keyof SectionContentMap];

/**
 * Predicate helpers behind every `emptyCondition`. They take `unknown`
 * because they run over stored documents; malformed content counts as empty.
 */
type Dict = Record<string, unknown>;
declare function isRecord(value: unknown): value is Dict;
/** A string that carries something once trimmed. */
declare function hasText(value: unknown): value is string;
declare function hasItems(value: unknown): value is unknown[];
/** True when every named key on `content` is blank. */
declare function allBlank(content: unknown, keys: readonly string[]): boolean;
/**
 * The default for a collection: empty when `items` holds nothing. An optional
 * `keep` predicate discounts items that would themselves render as nothing.
 */
declare function collectionIsEmpty(content: unknown, keep?: (item: unknown) => boolean): boolean;

/**
 * The section descriptors — the single source of truth. Key order here is the
 * default section order, and the order of each `fields` / `itemFields` array
 * is the public render order: section components iterate those arrays.
 */
declare const REGISTRY: {
    readonly hero: {
        readonly type: "hero";
        readonly label: "Hero";
        readonly description: "Who you are, in one screen.";
        readonly priority: "must";
        readonly cardinality: "single";
        readonly fields: readonly [{
            readonly key: "title";
            readonly label: "Professional title";
            readonly kind: "text";
            readonly required: true;
            readonly group: "intro";
            readonly help: "Rendered as the eyebrow above your name.";
        }, {
            readonly key: "name";
            readonly label: "Name";
            readonly kind: "text";
            readonly required: true;
            readonly group: "intro";
        }, {
            readonly key: "tagline";
            readonly label: "Tagline";
            readonly kind: "text";
            readonly group: "intro";
            readonly max: 120;
            readonly help: "One or two lines. What you do, not what you are called.";
        }, {
            readonly key: "bio";
            readonly label: "Short bio";
            readonly kind: "longtext";
            readonly group: "intro";
            readonly max: 400;
            readonly help: "Two or three sentences.";
        }, {
            readonly key: "ctas";
            readonly label: "Calls to action";
            readonly kind: "list";
            readonly group: "intro";
            readonly max: 2;
            readonly help: "The first renders as the primary button.";
        }, {
            readonly key: "avatar";
            readonly label: "Photo";
            readonly kind: "image";
            readonly group: "portrait";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly projects: {
        readonly type: "projects";
        readonly label: "Selected work";
        readonly description: "Three to five projects, each scannable in fifteen seconds.";
        readonly priority: "must";
        readonly cardinality: "collection";
        readonly min: 3;
        readonly max: 5;
        readonly sectionFields: readonly [{
            readonly key: "categories";
            readonly label: "Filter categories";
            readonly kind: "tags";
        }];
        readonly itemFields: readonly [{
            readonly key: "screenshot";
            readonly label: "Screenshot";
            readonly kind: "image";
            readonly group: "shot";
        }, {
            readonly key: "category";
            readonly label: "Category";
            readonly kind: "text";
            readonly group: "meta";
        }, {
            readonly key: "year";
            readonly label: "Year";
            readonly kind: "text";
            readonly group: "meta";
        }, {
            readonly key: "title";
            readonly label: "Title";
            readonly kind: "text";
            readonly required: true;
        }, {
            readonly key: "problem";
            readonly label: "Problem";
            readonly kind: "longtext";
            readonly required: true;
            readonly group: "summary";
        }, {
            readonly key: "impact";
            readonly label: "Impact";
            readonly kind: "longtext";
            readonly required: true;
            readonly group: "summary";
            readonly help: "Required. Where no metric exists, state what changed.";
        }, {
            readonly key: "stack";
            readonly label: "Stack";
            readonly kind: "tags";
            readonly group: "summary";
        }, {
            readonly key: "solution";
            readonly label: "Solution";
            readonly kind: "longtext";
            readonly group: "summary";
        }, {
            readonly key: "role";
            readonly label: "My role";
            readonly kind: "longtext";
            readonly group: "summary";
            readonly help: "One line for the card. The long account goes in \"My role\" below.";
        }, {
            readonly key: "bodies.business";
            readonly label: "Business case";
            readonly kind: "longtext";
            readonly required: true;
            readonly group: "body";
            readonly help: "Plain paragraphs and lists. No links or images.";
        }, {
            readonly key: "bodies.solution";
            readonly label: "Solution";
            readonly kind: "longtext";
            readonly required: true;
            readonly group: "body";
            readonly help: "Plain paragraphs and lists. No links or images.";
        }, {
            readonly key: "designation";
            readonly label: "My designation";
            readonly kind: "text";
            readonly required: true;
            readonly group: "body";
            readonly help: "The title you held on this engagement, e.g. \"Lead front-end engineer\".";
        }, {
            readonly key: "bodies.role";
            readonly label: "My role";
            readonly kind: "longtext";
            readonly required: true;
            readonly group: "body";
            readonly help: "Plain paragraphs and lists. No links or images. First person, naming the components you owned — not \"worked on\".";
        }, {
            readonly key: "stackWorkedOn";
            readonly label: "Tech stack I worked on";
            readonly kind: "tags";
            readonly required: true;
            readonly group: "body";
            readonly help: "The part of the stack you personally touched. A subset of \"Full tech stack\".";
        }, {
            readonly key: "tools";
            readonly label: "Tools";
            readonly kind: "tags";
            readonly required: true;
            readonly group: "body";
            readonly help: "Non-runtime tooling — editors, CI, observability, design. Orthogonal to both stack lists, not a subset of either.";
        }, {
            readonly key: "fullStack";
            readonly label: "Full tech stack";
            readonly kind: "tags";
            readonly required: true;
            readonly group: "body";
            readonly help: "Everything the project runs on, including parts you did not work on. A superset of \"Tech stack I worked on\".";
        }, {
            readonly key: "demoUrl";
            readonly label: "Live demo";
            readonly kind: "url";
            readonly group: "links";
        }, {
            readonly key: "repoUrl";
            readonly label: "Source";
            readonly kind: "url";
            readonly group: "links";
        }, {
            readonly key: "confidential";
            readonly label: "Confidential engagement";
            readonly kind: "boolean";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly skills: {
        readonly type: "skills";
        readonly label: "Prominent skills";
        readonly description: "One list, two tiers.";
        readonly priority: "must";
        readonly cardinality: "collection";
        readonly sectionFields: readonly [{
            readonly key: "legend";
            readonly label: "Rating scale legend";
            readonly kind: "longtext";
        }, {
            readonly key: "categories";
            readonly label: "Categories";
            readonly kind: "tags";
        }];
        readonly itemFields: readonly [{
            readonly key: "name";
            readonly label: "Skill";
            readonly kind: "text";
            readonly required: true;
            readonly group: "headline";
        }, {
            readonly key: "rating";
            readonly label: "Rating";
            readonly kind: "number";
            readonly required: true;
            readonly group: "headline";
            readonly help: "1-10. Always rendered as text beside the bar.";
        }, {
            readonly key: "category";
            readonly label: "Category";
            readonly kind: "text";
            readonly required: true;
        }, {
            readonly key: "prominent";
            readonly label: "Feature in the prominent tier";
            readonly kind: "boolean";
            readonly help: "Between five and eight skills, enforced at publish.";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly contact: {
        readonly type: "contact";
        readonly label: "Contact";
        readonly description: "How to reach you. Each link toggles independently.";
        readonly priority: "must";
        readonly cardinality: "single";
        readonly fields: readonly [{
            readonly key: "intro";
            readonly label: "Intro";
            readonly kind: "longtext";
            readonly max: 200;
        }, {
            readonly key: "email";
            readonly label: "Email";
            readonly kind: "email";
            readonly group: "links";
        }, {
            readonly key: "github";
            readonly label: "GitHub";
            readonly kind: "link";
            readonly group: "links";
        }, {
            readonly key: "linkedin";
            readonly label: "LinkedIn";
            readonly kind: "link";
            readonly group: "links";
        }, {
            readonly key: "x";
            readonly label: "X";
            readonly kind: "link";
            readonly group: "links";
        }, {
            readonly key: "site";
            readonly label: "Personal site";
            readonly kind: "link";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly experience: {
        readonly type: "experience";
        readonly label: "Experience";
        readonly description: "Roles, most recent first.";
        readonly priority: "should";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "title";
            readonly label: "Title";
            readonly kind: "text";
            readonly required: true;
            readonly group: "headline";
        }, {
            readonly key: "company";
            readonly label: "Company";
            readonly kind: "text";
            readonly required: true;
            readonly group: "headline";
        }, {
            readonly key: "startDate";
            readonly label: "From";
            readonly kind: "date";
            readonly group: "dates";
        }, {
            readonly key: "endDate";
            readonly label: "To";
            readonly kind: "date";
            readonly group: "dates";
        }, {
            readonly key: "description";
            readonly label: "Summary";
            readonly kind: "longtext";
        }, {
            readonly key: "accomplishments";
            readonly label: "Accomplishments";
            readonly kind: "list";
            readonly group: "detail";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly education: {
        readonly type: "education";
        readonly label: "Education";
        readonly description: "Qualifications, with optional detail.";
        readonly priority: "should";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "degree";
            readonly label: "Degree";
            readonly kind: "text";
            readonly required: true;
            readonly group: "headline";
        }, {
            readonly key: "institution";
            readonly label: "Institution";
            readonly kind: "text";
            readonly required: true;
            readonly group: "headline";
        }, {
            readonly key: "graduated";
            readonly label: "Graduated";
            readonly kind: "date";
            readonly group: "dates";
        }, {
            readonly key: "gpa";
            readonly label: "GPA";
            readonly kind: "text";
            readonly group: "detail";
        }, {
            readonly key: "coursework";
            readonly label: "Coursework";
            readonly kind: "tags";
            readonly group: "detail";
        }, {
            readonly key: "scholarships";
            readonly label: "Scholarships";
            readonly kind: "list";
            readonly group: "detail";
        }, {
            readonly key: "honours";
            readonly label: "Honours";
            readonly kind: "list";
            readonly group: "detail";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly blog: {
        readonly type: "blog";
        readonly label: "Writing";
        readonly description: "Posts, entered manually or synced from a feed.";
        readonly priority: "should";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "date";
            readonly label: "Date";
            readonly kind: "date";
            readonly group: "meta";
        }, {
            readonly key: "title";
            readonly label: "Title";
            readonly kind: "text";
            readonly required: true;
        }, {
            readonly key: "summary";
            readonly label: "Summary";
            readonly kind: "longtext";
        }, {
            readonly key: "url";
            readonly label: "Read the post";
            readonly kind: "url";
            readonly required: true;
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly testimonials: {
        readonly type: "testimonials";
        readonly label: "Testimonials";
        readonly description: "Two to four, in the words of people you worked with.";
        readonly priority: "should";
        readonly cardinality: "collection";
        readonly min: 2;
        readonly max: 4;
        readonly itemFields: readonly [{
            readonly key: "quote";
            readonly label: "Quote";
            readonly kind: "longtext";
            readonly required: true;
        }, {
            readonly key: "photo";
            readonly label: "Photo";
            readonly kind: "image";
            readonly group: "attribution";
        }, {
            readonly key: "name";
            readonly label: "Name";
            readonly kind: "text";
            readonly required: true;
            readonly group: "attribution";
        }, {
            readonly key: "role";
            readonly label: "Role";
            readonly kind: "text";
            readonly group: "attribution";
        }, {
            readonly key: "company";
            readonly label: "Company";
            readonly kind: "text";
            readonly group: "attribution";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly opensource: {
        readonly type: "opensource";
        readonly label: "Open source";
        readonly description: "Profile, statistics, and named contributions.";
        readonly priority: "should";
        readonly cardinality: "single";
        readonly fields: readonly [{
            readonly key: "stats";
            readonly label: "Statistics";
            readonly kind: "list";
            readonly group: "stats";
        }, {
            readonly key: "githubUsername";
            readonly label: "GitHub username";
            readonly kind: "text";
            readonly group: "github";
            readonly max: 39;
            readonly help: "Just the username — not the full profile URL.";
        }, {
            readonly key: "embedCards";
            readonly label: "Stat cards";
            readonly kind: "multiselect";
            readonly group: "github";
            readonly options: readonly ["stats", "languages", "streak"];
            readonly defaultValue: readonly ["stats", "languages"];
            readonly help: "Drawn by GitHub’s card service in the visitor’s browser. A card that fails to load disappears; it never leaves a gap.";
        }, {
            readonly key: "contributions";
            readonly label: "Contributions";
            readonly kind: "list";
            readonly max: 3;
        }, {
            readonly key: "profileUrl";
            readonly label: "GitHub profile";
            readonly kind: "url";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly speaking: {
        readonly type: "speaking";
        readonly label: "Speaking";
        readonly description: "Talks, with a link to video or slides.";
        readonly priority: "could";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "date";
            readonly label: "Date";
            readonly kind: "date";
            readonly group: "meta";
        }, {
            readonly key: "event";
            readonly label: "Event";
            readonly kind: "text";
            readonly group: "meta";
        }, {
            readonly key: "title";
            readonly label: "Talk";
            readonly kind: "text";
            readonly required: true;
        }, {
            readonly key: "url";
            readonly label: "Video or slides";
            readonly kind: "url";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly achievements: {
        readonly type: "achievements";
        readonly label: "Achievements";
        readonly description: "Certifications, awards, rankings, hackathons.";
        readonly priority: "should";
        readonly cardinality: "collection";
        readonly sectionFields: readonly [{
            readonly key: "credlyUsername";
            readonly label: "Credly username";
            readonly kind: "text";
            readonly help: "Used once to import your badges. Not stored as a live connection.";
        }];
        readonly itemFields: readonly [{
            readonly key: "source";
            readonly label: "Source";
            readonly kind: "enum";
            readonly options: readonly ["manual", "credly"];
            readonly defaultValue: "manual";
            readonly hidden: true;
        }, {
            readonly key: "credlyBadgeId";
            readonly label: "Credly badge";
            readonly kind: "text";
            readonly help: "Paste the embed code from Credly — we will pull the ID out of it.";
        }, {
            readonly key: "type";
            readonly label: "Type";
            readonly kind: "enum";
            readonly options: readonly ["certification", "award", "ranking", "hackathon"];
            readonly group: "meta";
        }, {
            readonly key: "date";
            readonly label: "Date";
            readonly kind: "date";
            readonly group: "meta";
        }, {
            readonly key: "title";
            readonly label: "Title";
            readonly kind: "text";
            readonly required: true;
        }, {
            readonly key: "issuer";
            readonly label: "Issuer";
            readonly kind: "text";
        }, {
            readonly key: "url";
            readonly label: "Details";
            readonly kind: "url";
            readonly group: "links";
        }, {
            readonly key: "verifyUrl";
            readonly label: "Verification link";
            readonly kind: "url";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly trainings: {
        readonly type: "trainings";
        readonly label: "Training";
        readonly description: "Courses, workshops, bootcamps and structured programmes. Recent and role-relevant learning only — an entry earns its place by supporting the role you are aiming at, not by having been completed.";
        readonly priority: "could";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "type";
            readonly label: "Type";
            readonly kind: "enum";
            readonly options: readonly ["certification", "award", "ranking", "hackathon"];
            readonly group: "meta";
        }, {
            readonly key: "date";
            readonly label: "Completed";
            readonly kind: "date";
            readonly group: "meta";
        }, {
            readonly key: "title";
            readonly label: "Title";
            readonly kind: "text";
            readonly required: true;
            readonly help: "List a credential once — as an achievement or as a training, never in both sections.";
        }, {
            readonly key: "issuer";
            readonly label: "Issuing body";
            readonly kind: "text";
        }, {
            readonly key: "url";
            readonly label: "Certificate or course page";
            readonly kind: "url";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
    readonly gallery: {
        readonly type: "gallery";
        readonly label: "Gallery";
        readonly description: "Images and embedded video.";
        readonly priority: "could";
        readonly cardinality: "collection";
        readonly itemFields: readonly [{
            readonly key: "image";
            readonly label: "Image";
            readonly kind: "image";
        }, {
            readonly key: "caption";
            readonly label: "Caption";
            readonly kind: "text";
        }, {
            readonly key: "videoUrl";
            readonly label: "Video";
            readonly kind: "url";
            readonly group: "links";
        }];
        readonly emptyCondition: (content: unknown) => boolean;
    };
};
type Registry = typeof REGISTRY;
declare function getDescriptor(type: SectionType): SectionDescriptor;
/** An enabled section whose content satisfies this is omitted from the page entirely. */
declare function isSectionEmpty(type: SectionType, content: unknown): boolean;

/** Named starting configurations, applied once at portfolio creation. */
declare const PRESET_IDS: readonly ["software-engineer"];
type PresetId = (typeof PRESET_IDS)[number];
interface InitialDraft {
    readonly sections: SectionInstance[];
    readonly theme: Record<string, unknown>;
    readonly seo: Record<string, unknown>;
    readonly analytics: null;
}
declare function isPresetId(value: unknown): value is PresetId;
/**
 * The initial draft tree for a preset: one entry per section type, in registry
 * order. Pure. `name` is the display name from the creation screen and lands
 * in the hero's `name`.
 */
declare function createInitialDraft(presetId: PresetId, options?: {
    name?: string;
}): InitialDraft;

/**
 * Extracts a Credly badge id from a pasted embed snippet, badge link, or bare
 * id, and discards everything else. Storing tenant markup and injecting it at
 * render would be stored XSS, so only the id is ever kept.
 */
/** The origin the import reads from, and the host the embed points at. */
declare const CREDLY_ORIGIN = "https://www.credly.com";
/**
 * The badge id from a paste, or `null` when there is none. The input is never
 * returned, and callers must not log it in full.
 */
declare function parseCredlyBadgeId(input: unknown): string | null;

/**
 * One-time import of a public Credly wallet, run only on tenant action: no
 * schedule, no cache, no connection. Kept apart from parse.ts so the portfolio
 * build carries no HTTP client.
 *
 * The upstream endpoint is undocumented and may change, so every field is read
 * defensively and an unrecognised response is a handled error, never a throw.
 */

/** Injectable so the api can supply a guarded fetch. */
type FetchLike = typeof fetch;
interface CredlyImportOptions {
    readonly fetchImpl?: FetchLike;
    readonly timeoutMs?: number;
}
interface CredlyImportSuccess {
    readonly ok: true;
    /** New items, to append to the draft only. The tenant reviews before publishing. */
    readonly items: readonly AchievementItem[];
    /** Badges already present, left untouched along with any edits to them. */
    readonly duplicates: number;
    /** Entries the upstream response could not be read into an item. */
    readonly unusable: number;
}
interface CredlyImportFailure {
    readonly ok: false;
    readonly error: FieldError;
}
type CredlyImportOutcome = CredlyImportSuccess | CredlyImportFailure;
/**
 * The wallet URL. SSRF guard: the origin is constant and the username is one
 * percent-encoded path segment, so no input can move the request to another
 * host; `redirect: 'error'` on the fetch stops a redirect doing so.
 */
declare function credlyBadgesUrl(username: string): string;
/**
 * Reads the wallet and returns the items to append to the draft. A badge
 * already in `existing` is counted and skipped, so a re-run never overwrites
 * the tenant's edits. Only the first page is read.
 */
declare function importCredlyBadges(username: unknown, existing?: readonly AchievementItem[], options?: CredlyImportOptions): Promise<CredlyImportOutcome>;

export { type AchievementItem, type AchievementSource, type AchievementType, type AchievementsContent, type BlogContent, type BlogPost, CREDLY_ORIGIN, type Collection, type ContactContent, type ContactLink, type CredlyImportFailure, type CredlyImportOptions, type CredlyImportOutcome, type CredlyImportSuccess, type Cta, type CtaKind, type EducationContent, type EducationItem, type ExperienceContent, type ExperienceItem, type FetchLike, FieldError, GITHUB_EMBED_CARDS, type GalleryContent, type GalleryItem, type GitHubEmbedCard, type HeroContent, type ImageRef, type InitialDraft, MIN_SUPPORTED_REGISTRY_VERSION, type OpenSourceContent, type OpenSourceContribution, type OpenSourceStats, PRESET_IDS, type PresetId, type ProjectBodies, type ProjectItem, type ProjectsContent, REGISTRY, REGISTRY_VERSION, type Registry, type SectionContentMap, SectionDescriptor, SectionInstance, SectionType, type SkillItem, type SkillsContent, type SpeakingContent, type SpeakingItem, type Testimonial, type TestimonialsContent, type TrainingItem, type TrainingsContent, type TypedSectionInstance, allBlank, collectionIsEmpty, createInitialDraft, credlyBadgesUrl, getDescriptor, hasItems, hasText, importCredlyBadges, isPresetId, isRecord, isSectionEmpty, isSupportedRegistryVersion, parseCredlyBadgeId };
