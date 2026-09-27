import {
  allBlank,
  collectionIsEmpty,
  hasItems,
  hasText,
  isRecord
} from "./chunk-TOWCQGC3.js";

// src/types.ts
var SECTION_TYPES = [
  "hero",
  "projects",
  "skills",
  "contact",
  "experience",
  "education",
  "blog",
  "testimonials",
  "opensource",
  "speaking",
  "achievements",
  /*
   * Registry order is the default section order, so `trainings` sits directly
   * after `achievements` and before `gallery` (SRS §4.1). It shares that
   * neighbour's field schema verbatim and none of its Credly path.
   */
  "trainings",
  "gallery"
];

// src/version.ts
var REGISTRY_VERSION = 2;
var MIN_SUPPORTED_REGISTRY_VERSION = 1;
function isSupportedRegistryVersion(version) {
  return typeof version === "number" && Number.isInteger(version) && version >= MIN_SUPPORTED_REGISTRY_VERSION && version <= REGISTRY_VERSION;
}

// src/content.ts
var GITHUB_EMBED_CARDS = ["stats", "languages", "streak"];

// src/sections/hero.ts
var hero = {
  type: "hero",
  label: "Hero",
  description: "Who you are, in one screen.",
  priority: "must",
  businessRef: "BR 1",
  cardinality: "single",
  fields: [
    {
      key: "title",
      label: "Professional title",
      kind: "text",
      required: true,
      group: "intro",
      help: "Rendered as the eyebrow above your name."
    },
    {
      key: "name",
      label: "Name",
      kind: "text",
      required: true,
      group: "intro"
    },
    {
      key: "tagline",
      label: "Tagline",
      kind: "text",
      group: "intro",
      max: 120,
      help: "One or two lines. What you do, not what you are called."
    },
    {
      key: "bio",
      label: "Short bio",
      kind: "longtext",
      group: "intro",
      max: 400,
      help: "Two or three sentences."
    },
    {
      key: "ctas",
      label: "Calls to action",
      kind: "list",
      group: "intro",
      max: 2,
      help: "The first renders as the primary button."
    },
    { key: "avatar", label: "Photo", kind: "image", group: "portrait" }
  ],
  emptyCondition: (content) => allBlank(content, ["name", "title", "tagline", "bio", "ctas", "avatar"])
};

// src/sections/projects.ts
var projects = {
  type: "projects",
  label: "Selected work",
  description: "Three to five projects, each scannable in fifteen seconds.",
  priority: "must",
  businessRef: "BR 2",
  cardinality: "collection",
  min: 3,
  max: 5,
  sectionFields: [
    { key: "categories", label: "Filter categories", kind: "tags" }
  ],
  itemFields: [
    { key: "screenshot", label: "Screenshot", kind: "image", group: "shot" },
    { key: "category", label: "Category", kind: "text", group: "meta" },
    { key: "year", label: "Year", kind: "text", group: "meta" },
    { key: "title", label: "Title", kind: "text", required: true },
    {
      key: "problem",
      label: "Problem",
      kind: "longtext",
      required: true,
      group: "summary"
    },
    {
      key: "impact",
      label: "Impact",
      kind: "longtext",
      required: true,
      group: "summary",
      help: "Required. Where no metric exists, state what changed."
    },
    { key: "stack", label: "Stack", kind: "tags", group: "summary" },
    /* Grouped with the summary above, not held back behind a disclosure:
       the card is one description list now that the case study has moved
       into the modal. */
    { key: "solution", label: "Solution", kind: "longtext", group: "summary" },
    {
      key: "role",
      label: "My role",
      kind: "longtext",
      group: "summary",
      help: 'One line for the card. The long account goes in "My role" below.'
    },
    /*
     * The case study behind the card (FR-SEC-PROJ-1, business 2.17–2.23).
     *
     * This array is the modal's sub-section order, not just the admin form's:
     * ProjectModal walks these same descriptors to draw its labelled regions,
     * so the seven cannot be rendered in an order this file did not declare
     * (FR-REG-2). Moving an entry here moves the section in the modal.
     *
     * `bodies.*` keys are dotted because the three rich-text bodies nest
     * under one object; `FieldError.path` is already a dotted path, so a
     * failure addresses the field the tenant sees.
     */
    {
      key: "bodies.business",
      label: "Business case",
      kind: "longtext",
      required: true,
      group: "body",
      help: "Plain paragraphs and lists. No links or images."
    },
    {
      key: "bodies.solution",
      label: "Solution",
      kind: "longtext",
      required: true,
      group: "body",
      help: "Plain paragraphs and lists. No links or images."
    },
    {
      key: "designation",
      label: "My designation",
      kind: "text",
      required: true,
      group: "body",
      help: 'The title you held on this engagement, e.g. "Lead front-end engineer".'
    },
    {
      key: "bodies.role",
      label: "My role",
      kind: "longtext",
      required: true,
      group: "body",
      /* FR-SEC-PROJ-8's guidance attaches here, to the long account — not to
         the card's one-line `role` above. */
      help: 'Plain paragraphs and lists. No links or images. First person, naming the components you owned \u2014 not "worked on".'
    },
    {
      key: "stackWorkedOn",
      label: "Tech stack I worked on",
      kind: "tags",
      required: true,
      group: "body",
      help: 'The part of the stack you personally touched. A subset of "Full tech stack".'
    },
    {
      key: "tools",
      label: "Tools",
      kind: "tags",
      required: true,
      group: "body",
      help: "Non-runtime tooling \u2014 editors, CI, observability, design. Orthogonal to both stack lists, not a subset of either."
    },
    {
      key: "fullStack",
      label: "Full tech stack",
      kind: "tags",
      required: true,
      group: "body",
      help: 'Everything the project runs on, including parts you did not work on. A superset of "Tech stack I worked on".'
    },
    { key: "demoUrl", label: "Live demo", kind: "url", group: "links" },
    { key: "repoUrl", label: "Source", kind: "url", group: "links" },
    {
      key: "confidential",
      label: "Confidential engagement",
      kind: "boolean",
      group: "links"
    }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.title)
  )
};

// src/sections/skills.ts
var skills = {
  type: "skills",
  label: "Prominent skills",
  description: "One list, two tiers.",
  priority: "must",
  businessRef: "BR 3",
  cardinality: "collection",
  sectionFields: [
    { key: "legend", label: "Rating scale legend", kind: "longtext" },
    { key: "categories", label: "Categories", kind: "tags" }
  ],
  itemFields: [
    {
      key: "name",
      label: "Skill",
      kind: "text",
      required: true,
      group: "headline"
    },
    {
      key: "rating",
      label: "Rating",
      kind: "number",
      required: true,
      group: "headline",
      help: "1-10. Always rendered as text beside the bar."
    },
    { key: "category", label: "Category", kind: "text", required: true },
    {
      key: "prominent",
      label: "Feature in the prominent tier",
      kind: "boolean",
      help: "Between five and eight skills, enforced at publish."
    }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.name)
  )
};

// src/sections/contact.ts
var contact = {
  type: "contact",
  label: "Contact",
  description: "How to reach you. Each link toggles independently.",
  priority: "must",
  businessRef: "BR 4",
  cardinality: "single",
  fields: [
    { key: "intro", label: "Intro", kind: "longtext", max: 200 },
    { key: "email", label: "Email", kind: "email", group: "links" },
    { key: "github", label: "GitHub", kind: "link", group: "links" },
    { key: "linkedin", label: "LinkedIn", kind: "link", group: "links" },
    { key: "x", label: "X", kind: "link", group: "links" },
    { key: "site", label: "Personal site", kind: "link", group: "links" }
  ],
  emptyCondition: (content) => {
    if (!isRecord(content)) return true;
    const keys = ["email", "github", "linkedin", "x", "site"];
    return !keys.some((key) => {
      const link = content[key];
      return isRecord(link) && link.visible === true && hasText(link.value);
    });
  }
};

// src/sections/experience.ts
var experience = {
  type: "experience",
  label: "Experience",
  description: "Roles, most recent first.",
  priority: "should",
  businessRef: "BR 5",
  cardinality: "collection",
  itemFields: [
    {
      key: "title",
      label: "Title",
      kind: "text",
      required: true,
      group: "headline"
    },
    {
      key: "company",
      label: "Company",
      kind: "text",
      required: true,
      group: "headline"
    },
    { key: "startDate", label: "From", kind: "date", group: "dates" },
    { key: "endDate", label: "To", kind: "date", group: "dates" },
    { key: "description", label: "Summary", kind: "longtext" },
    {
      key: "accomplishments",
      label: "Accomplishments",
      kind: "list",
      group: "detail"
    }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && (hasText(item.title) || hasText(item.company))
  )
};

// src/sections/education.ts
var education = {
  type: "education",
  label: "Education",
  description: "Qualifications, with optional detail.",
  priority: "should",
  businessRef: "BR 6",
  cardinality: "collection",
  itemFields: [
    {
      key: "degree",
      label: "Degree",
      kind: "text",
      required: true,
      group: "headline"
    },
    {
      key: "institution",
      label: "Institution",
      kind: "text",
      required: true,
      group: "headline"
    },
    { key: "graduated", label: "Graduated", kind: "date", group: "dates" },
    { key: "gpa", label: "GPA", kind: "text", group: "detail" },
    { key: "coursework", label: "Coursework", kind: "tags", group: "detail" },
    {
      key: "scholarships",
      label: "Scholarships",
      kind: "list",
      group: "detail"
    },
    { key: "honours", label: "Honours", kind: "list", group: "detail" }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && (hasText(item.degree) || hasText(item.institution))
  )
};

// src/sections/blog.ts
var blog = {
  type: "blog",
  label: "Writing",
  description: "Posts, entered manually or synced from a feed.",
  priority: "should",
  businessRef: "BR 7",
  cardinality: "collection",
  itemFields: [
    { key: "date", label: "Date", kind: "date", group: "meta" },
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "summary", label: "Summary", kind: "longtext" },
    {
      key: "url",
      label: "Read the post",
      kind: "url",
      required: true,
      group: "links"
    }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.title) && hasText(item.url)
  )
};

// src/sections/testimonials.ts
var testimonials = {
  type: "testimonials",
  label: "Testimonials",
  description: "Two to four, in the words of people you worked with.",
  priority: "should",
  businessRef: "BR 8",
  cardinality: "collection",
  min: 2,
  max: 4,
  itemFields: [
    { key: "quote", label: "Quote", kind: "longtext", required: true },
    { key: "photo", label: "Photo", kind: "image", group: "attribution" },
    {
      key: "name",
      label: "Name",
      kind: "text",
      required: true,
      group: "attribution"
    },
    { key: "role", label: "Role", kind: "text", group: "attribution" },
    { key: "company", label: "Company", kind: "text", group: "attribution" }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.quote)
  )
};

// src/sections/opensource.ts
var opensource = {
  type: "opensource",
  label: "Open source",
  description: "Profile, statistics, and named contributions.",
  priority: "should",
  businessRef: "BR 9",
  cardinality: "single",
  fields: [
    { key: "stats", label: "Statistics", kind: "list", group: "stats" },
    {
      key: "githubUsername",
      label: "GitHub username",
      kind: "text",
      group: "github",
      max: 39,
      help: "Just the username \u2014 not the full profile URL."
    },
    {
      key: "embedCards",
      label: "Stat cards",
      kind: "multiselect",
      group: "github",
      options: GITHUB_EMBED_CARDS,
      defaultValue: ["stats", "languages"],
      help: "Drawn by GitHub\u2019s card service in the visitor\u2019s browser. A card that fails to load disappears; it never leaves a gap."
    },
    { key: "contributions", label: "Contributions", kind: "list", max: 3 },
    {
      key: "profileUrl",
      label: "GitHub profile",
      kind: "url",
      group: "links"
    }
  ],
  /*
   * The embed counts towards emptiness: a tenant whose only open-source
   * content is a username still has a section worth drawing, and one with
   * nothing at all still gets no heading (FR-CFG-2).
   */
  emptyCondition: (content) => {
    if (!isRecord(content)) return true;
    const stats = content.stats;
    const hasStats = isRecord(stats) && Object.values(stats).some((value) => typeof value === "number");
    return !hasText(content.githubUsername) && !hasStats && !hasItems(content.contributions) && !hasText(content.profileUrl);
  }
};

// src/sections/speaking.ts
var speaking = {
  type: "speaking",
  label: "Speaking",
  description: "Talks, with a link to video or slides.",
  priority: "could",
  businessRef: "BR 10",
  cardinality: "collection",
  itemFields: [
    { key: "date", label: "Date", kind: "date", group: "meta" },
    { key: "event", label: "Event", kind: "text", group: "meta" },
    { key: "title", label: "Talk", kind: "text", required: true },
    { key: "url", label: "Video or slides", kind: "url", group: "links" }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.title)
  )
};

// src/sections/achievements.ts
var achievements = {
  type: "achievements",
  label: "Achievements",
  description: "Certifications, awards, rankings, hackathons.",
  priority: "should",
  businessRef: "BR 11",
  cardinality: "collection",
  sectionFields: [
    {
      key: "credlyUsername",
      label: "Credly username",
      kind: "text",
      help: "Used once to import your badges. Not stored as a live connection."
    }
  ],
  /*
   * One flat collection, imported and hand-written items side by side. The
   * badge fields sit at the top of the render order because a badge leads
   * with its picture; an item that has none simply skips them, which is how
   * a manual achievement keeps exactly the layout it had before Credly
   * existed (FR-REG-2).
   */
  itemFields: [
    {
      key: "source",
      label: "Source",
      kind: "enum",
      options: ["manual", "credly"],
      defaultValue: "manual",
      hidden: true
    },
    {
      key: "credlyBadgeId",
      label: "Credly badge",
      kind: "text",
      help: "Paste the embed code from Credly \u2014 we will pull the ID out of it."
    },
    {
      key: "type",
      label: "Type",
      kind: "enum",
      options: ["certification", "award", "ranking", "hackathon"],
      group: "meta"
    },
    { key: "date", label: "Date", kind: "date", group: "meta" },
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "issuer", label: "Issuer", kind: "text" },
    { key: "url", label: "Details", kind: "url", group: "links" },
    {
      key: "verifyUrl",
      label: "Verification link",
      kind: "url",
      group: "links"
    }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.title)
  )
};

// src/sections/trainings.ts
var trainings = {
  type: "trainings",
  label: "Training",
  /*
   * FR-CFG-6: the source document's guidance, surfaced in admin as advice.
   * Both hints below are editorial judgements (11a.3, 11a.4) — the system
   * cannot tell whether a course is role-relevant, or that the certification
   * listed here is the same one listed under Achievements. Nothing validates
   * them, and nothing blocks a publish over them.
   */
  description: "Courses, workshops, bootcamps and structured programmes. Recent and role-relevant learning only \u2014 an entry earns its place by supporting the role you are aiming at, not by having been completed.",
  priority: "could",
  businessRef: "BR 11a",
  cardinality: "collection",
  itemFields: [
    {
      key: "type",
      label: "Type",
      kind: "enum",
      options: ["certification", "award", "ranking", "hackathon"],
      group: "meta"
    },
    { key: "date", label: "Completed", kind: "date", group: "meta" },
    {
      key: "title",
      label: "Title",
      kind: "text",
      required: true,
      help: "List a credential once \u2014 as an achievement or as a training, never in both sections."
    },
    { key: "issuer", label: "Issuing body", kind: "text" },
    {
      key: "url",
      label: "Certificate or course page",
      kind: "url",
      group: "links"
    }
  ],
  /* The same predicate as achievements: an item with no title draws nothing,
     and a collection of nothing but those is an empty section (FR-CFG-2). */
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && hasText(item.title)
  )
};

// src/sections/gallery.ts
var gallery = {
  type: "gallery",
  label: "Gallery",
  description: "Images and embedded video.",
  priority: "could",
  businessRef: "BR 12",
  cardinality: "collection",
  itemFields: [
    { key: "image", label: "Image", kind: "image" },
    { key: "caption", label: "Caption", kind: "text" },
    { key: "videoUrl", label: "Video", kind: "url", group: "links" }
  ],
  emptyCondition: (content) => collectionIsEmpty(
    content,
    (item) => isRecord(item) && (isRecord(item.image) || hasText(item.videoUrl))
  )
};

// src/sections/index.ts
var REGISTRY = {
  hero,
  projects,
  skills,
  contact,
  experience,
  education,
  blog,
  testimonials,
  opensource,
  speaking,
  achievements,
  trainings,
  gallery
};
function getDescriptor(type) {
  return REGISTRY[type];
}
function isSectionEmpty(type, content) {
  return REGISTRY[type].emptyCondition(content);
}

// src/credly/parse.ts
var CREDLY_ORIGIN = "https://www.credly.com";
var EMBED_ATTRIBUTE = /data-share-badge-id=["']([0-9a-f-]{36})["']/i;
var BADGE_URL = /[/]badges[/]([0-9a-f-]{36})/i;
var BARE_ID = /^[0-9a-f-]{36}$/i;
var MAX_PASTE_LENGTH = 2e4;
function firstMatch(pattern, input) {
  const match = pattern.exec(input);
  return match ? match[1].toLowerCase() : null;
}
function parseCredlyBadgeId(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PASTE_LENGTH) return null;
  return firstMatch(EMBED_ATTRIBUTE, trimmed) ?? firstMatch(BADGE_URL, trimmed) ?? (BARE_ID.test(trimmed) ? trimmed.toLowerCase() : null);
}

// src/credly/import.ts
var DEFAULT_TIMEOUT_MS = 1e4;
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function fail(path, message) {
  return { ok: false, error: { path, message } };
}
var UNAVAILABLE = "Could not import from Credly just now. The badge list is unavailable or in a form we do not recognise \u2014 try again later, or add a badge by pasting its embed code.";
function credlyBadgesUrl(username) {
  const path = `/users/${encodeURIComponent(username)}/badges`;
  return `${CREDLY_ORIGIN}${path}?sort=-state_updated_at&page=1`;
}
function yearOf(value) {
  const raw = text(value);
  if (raw === void 0) return void 0;
  const year = raw.slice(0, 4);
  return /^[0-9]{4}$/.test(year) ? year : void 0;
}
function issuerOf(template) {
  const issuer = template.issuer;
  if (!isRecord2(issuer)) return void 0;
  const entities = issuer.entities;
  if (Array.isArray(entities)) {
    for (const entry of entities) {
      if (isRecord2(entry) && isRecord2(entry.entity)) {
        const name = text(entry.entity.name);
        if (name !== void 0) return name;
      }
    }
  }
  return text(issuer.name);
}
function toItem(raw) {
  if (!isRecord2(raw)) return null;
  const badgeId = text(raw.id)?.toLowerCase();
  if (badgeId === void 0) return null;
  const template = isRecord2(raw.badge_template) ? raw.badge_template : {};
  const title = text(template.name) ?? text(raw.title);
  if (title === void 0) return null;
  return {
    id: `credly-${badgeId}`,
    type: "certification",
    source: "credly",
    title,
    issuer: issuerOf(template),
    date: yearOf(raw.issued_at),
    credlyBadgeId: badgeId,
    verifyUrl: text(raw.public_url)
  };
}
function badgeArray(payload) {
  if (!isRecord2(payload)) return null;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.badges)) return payload.badges;
  return null;
}
async function importCredlyBadges(username, existing = [], options = {}) {
  const name = typeof username === "string" ? username.trim() : "";
  if (name.length === 0) {
    return fail(
      "credlyUsername",
      "Enter the username from your Credly profile address."
    );
  }
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
  let payload;
  try {
    const response = await doFetch(credlyBadgesUrl(name), {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) {
      return response.status === 404 ? fail(
        "credlyUsername",
        "No public Credly profile found for that username."
      ) : fail("credlyUsername", UNAVAILABLE);
    }
    payload = await response.json();
  } catch {
    return fail("credlyUsername", UNAVAILABLE);
  } finally {
    clearTimeout(timer);
  }
  const badges = badgeArray(payload);
  if (badges === null) return fail("credlyUsername", UNAVAILABLE);
  const seen = new Set(
    existing.map((item) => item.credlyBadgeId).filter((id) => typeof id === "string" && id.length > 0).map((id) => id.toLowerCase())
  );
  const items = [];
  let duplicates = 0;
  let unusable = 0;
  for (const badge of badges) {
    const item = toItem(badge);
    if (item === null) {
      unusable++;
      continue;
    }
    const badgeId = item.credlyBadgeId;
    if (seen.has(badgeId)) {
      duplicates++;
      continue;
    }
    seen.add(badgeId);
    items.push(item);
  }
  return { ok: true, items, duplicates, unusable };
}
export {
  CREDLY_ORIGIN,
  GITHUB_EMBED_CARDS,
  MIN_SUPPORTED_REGISTRY_VERSION,
  REGISTRY,
  REGISTRY_VERSION,
  SECTION_TYPES,
  allBlank,
  collectionIsEmpty,
  credlyBadgesUrl,
  getDescriptor,
  hasItems,
  hasText,
  importCredlyBadges,
  isRecord,
  isSectionEmpty,
  isSupportedRegistryVersion,
  parseCredlyBadgeId
};
