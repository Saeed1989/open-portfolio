# Portfolio Website — Requirements

Priority: **Must** = launch blocker · **Should** = enable 2–3 at launch · **Could** = only if the content exists

---

## Core sections (always included)

### 1. Hero / About — Must

| ID | Requirement |
|---|---|
| 1.1 | Name and professional title (e.g. "Full-Stack Engineer", "ML Systems Developer") |
| 1.2 | Tagline of 1–2 lines stating the specialisation |
| 1.3 | Short bio of 2–3 sentences covering focus area and approach |
| 1.4 | Primary CTA button — download résumé, schedule a chat, or view GitHub |
| 1.5 | Optional avatar or photo; hiding it must not break the layout |

### 2. Featured Projects — Must

**2A — Per-project content**

| ID | Requirement |
|---|---|
| 2.1 | Title |
| 2.2 | Problem statement — the challenge the project addressed |
| 2.3 | Solution — what was built and the approach taken to build it |
| 2.4 | Tech stack — languages, frameworks, databases, tools |
| 2.5 | Impact / results — performance gains, users reached, time saved, quality improvements |
| 2.6 | Role — what the owner specifically architected or built, stated explicitly on team projects |
| 2.7 | At least one link to a working demo or source repository |
| 2.8 | Screenshot or visual showing what it looks like or how it works |

**2B — Section behaviour**

| ID | Requirement |
|---|---|
| 2.9 | 3–5 projects, owner-ordered; the cap is enforced rather than advisory |
| 2.10 | Filter by category — backend, frontend, data, DevOps, etc. |
| 2.11 | Fields appear in the same order for every project, so projects can be scanned and compared |
| 2.12 | Readable at two depths: a card scannable in ~15 seconds, with full detail on expand or a dedicated project page |

**2C — Content rules**

| ID | Requirement |
|---|---|
| 2.13 | Impact is stated as a measured number wherever one exists; where none does, state what changed rather than leaving 2.5 empty |
| 2.14 | Role is stated in the first person and names the specific components owned — not "worked on" |
| 2.15 | Confidential work: problem and approach are described without disclosing employer or client specifics, and the repo link may be omitted |
| 2.16 | Demo links are verified on a recurring schedule; a dead demo is worse than none, and a broken one is replaced with a walkthrough video or removed |

### 3. Skills & Tech Stack — Must

Two tiers on one page: a short showcase, then the full breakdown.

**3A — Prominent skills (top-level showcase)**

| ID | Requirement |
|---|---|
| 3.1 | 5–8 skills shown at a glance as the strongest and most relevant |
| 3.2 | Card grid layout — 2–3 columns on desktop, 1 column on mobile |
| 3.3 | Each card: skill name, efficiency bar, numeric rating out of 10 |
| 3.4 | All cards use the same accent colour, signalling "featured" as a set rather than ranking within it |
| 3.5 | Inclusion criteria: used across multiple projects, deepest expertise (8–10), relevant to the target role, in demand |

**3B — All skills (detailed breakdown)**

| ID | Requirement |
|---|---|
| 3.6 | Grouped by category: Backend, Frontend, Database, DevOps, Tools & Practices, and others as needed |
| 3.7 | Multi-column auto-fit layout that reflows to screen width |
| 3.8 | Each skill: name, efficiency bar, numeric rating out of 10 |
| 3.9 | Includes everything, including in-progress skills — a 5–6 rating is acceptable here |
| 3.10 | Bars are visually smaller than in 3A, giving clear hierarchy between the two tiers |

**3C — Rules across both tiers**

| ID | Requirement |
|---|---|
| 3.11 | Prominence is a flag on a skill, not a separate list — a prominent skill still appears in its category in 3B, and its rating is stored once |
| 3.12 | The rating scale is defined in writing before data entry, so scores stay consistent across skills |
| 3.13 | Ratings are honest and defensible under interview questioning — no padding |
| 3.14 | Within a category, recent and relevant tech is ordered above older entries |
| 3.15 | Rating is always readable as a number, not conveyed by bar length or colour alone |
| 3.16 | An empty category is hidden rather than rendered (see 18.1) |

### 4. Contact / Social — Must

| ID | Requirement |
|---|---|
| 4.1 | Email, GitHub, LinkedIn |
| 4.2 | X/Twitter and secondary personal site where applicable |
| 4.3 | Independent visibility toggle per link |

---

## Optional sections (pick 2–3)

### 5. Work Experience — Should

| ID | Requirement |
|---|---|
| 5.1 | Per role: company, title, dates, description |
| 5.2 | Accomplishments framed as impact, not duties |
| 5.3 | Roles individually collapsible / expandable |
| 5.4 | Ordering supports a career-progression narrative |

### 6. Education — Should

| ID | Requirement |
|---|---|
| 6.1 | Degree, institution, graduation date |
| 6.2 | Optional and individually hideable: GPA (only if strong), relevant coursework, scholarships, honours |
| 6.3 | Positioned below work and projects |

### 7. Blog / Technical Writing — Should

| ID | Requirement |
|---|---|
| 7.1 | Per post: title, date, summary, link |
| 7.2 | Sourced from Medium, Dev.to, Substack, or self-hosted |
| 7.3 | Enable only with 5+ solid posts |

### 8. Testimonials — Should

| ID | Requirement |
|---|---|
| 8.1 | Per entry: name, company, role, quote |
| 8.2 | Optional photo |
| 8.3 | 2–4 strong endorsements; can be pulled from LinkedIn |

### 9. Open Source — Should

| ID | Requirement |
|---|---|
| 9.1 | GitHub stats: repositories, commits over the last twelve months, pull requests, contributions |
| 9.2 | Link to GitHub profile |
| 9.3 | 2–3 major contributions highlighted by name |
| 9.4 | Impact shown where available — downloads, stars, adoption |
| 9.5 | The owner's own star total is not shown as a headline figure — it measures attention received, not work done. A specific project's stars may still appear as evidence of adoption under 9.4 |
| 9.6 | GitHub stat cards, embedded from GitHub's own card service: an overall statistics card, a most-used-languages card, and a contribution streak card |
| 9.7 | Owner chooses which cards appear. Statistics and languages are shown by default; the statistics card has its star count hidden so it agrees with 9.5 |
| 9.8 | Every figure that matters is also typed by the owner and rendered as text. A card is a picture whose numbers cannot be read aloud, so it is never the only place a number appears |

---

## Specialised sections (only if relevant)

### 10. Speaking & Talks — Could

| ID | Requirement |
|---|---|
| 10.1 | Per talk: conference name, date, title, link to video or slides |
| 10.2 | Enable only with active community involvement |

### 11. Achievements & Awards — Should

| ID | Requirement |
|---|---|
| 11.1 | Certifications, recognitions, rankings |
| 11.2 | Hackathon wins and competition results |
| 11.3 | High-signal badges only |
| 11.4 | Credly badges sit in the same list as hand-entered achievements, and are edited, reordered and deleted the same way |
| 11.5 | Two ways to add them: import every badge from a public Credly profile at once, or paste a single badge's embed code |
| 11.6 | Import is a one-time populate, not a live connection. Running it again adds only badges that are new, and leaves existing ones — including any the owner has edited — untouched |
| 11.7 | Imported badges arrive unpublished. Deciding which are high-signal under 11.3 is a judgement the import cannot make, so the owner culls before publishing |
| 11.8 | A badge renders as Credly's own embedded frame and shows the badge alone. Its name and issuer are carried alongside for screen readers, because the frame's contents cannot be read aloud |
| 11.9 | A badge's current state is drawn by Credly, not by the platform. A badge that has expired shows as expired, and the owner cannot restyle or suppress that |

### 12. Media Gallery — Could

| ID | Requirement |
|---|---|
| 12.1 | Screenshots, architecture diagrams, case-study visuals |
| 12.2 | Embedded demo video / product walkthrough |

---

## 13. Integrations

| ID | Requirement | Priority |
|---|---|---|
| 13.1 | GitHub — repository links, profile statistics, and embedded stat cards | Should |
| 13.2 | RSS feed from Medium or a personal blog | Should |
| 13.3 | Latest posts from X/Twitter | Could |
| 13.4 | LinkedIn import for experience and education | Could |
| 13.5 | Every integration has a manual fallback and fails silently — no broken sections if an API is down or rate-limited | Must |
| 13.6 | GitHub stat cards are images the visitor's browser requests from the card service directly. The site never calls GitHub itself: no account connection, no stored token, no refresh job, and nothing that can go stale | Must |
| 13.7 | A card that fails to load is removed rather than left broken. When every card fails, the owner's typed figures and profile link still show | Must |
| 13.8 | Credly — badges imported from a public profile, or added one at a time by pasting a badge's embed code | Should |
| 13.9 | Credly badges are frames the visitor's browser requests from Credly directly. The site never calls Credly to draw a page: no account connection, no stored credential, no refresh job | Must |
| 13.10 | Only the badge identifier is kept from a pasted embed code. The pasted markup itself is never stored, and never re-injected into a page | Must |

The GitHub cards and the Credly badges both come from third parties the platform does not control. That is a deliberate trade: a current picture with no sign-in and nothing to store, in exchange for a service that may be slow, rate-limited, or gone. When it is, the cards do not appear and the figures under 9.1 carry the section on their own.

Credly fails less gracefully, and it is worth stating plainly. An unknown, revoked or mistyped badge identifier is answered as though it were valid, so the badge frame draws nothing and the platform cannot tell that apart from one still loading. There is no way to hide it automatically — the owner is the one who notices a blank badge, and 11.4 lets them delete it.

---

## Site-wide configuration

### 14. Theme & branding — Must (14.3–14.4 Could)

| ID | Requirement |
|---|---|
| 14.1 | Colour scheme — accent colour, light and dark theme |
| 14.2 | Font choices |
| 14.3 | Logo / avatar used across the site and in social previews |
| 14.4 | Layout density — compact or spacious |

### 15. SEO & metadata — Must

| ID | Requirement |
|---|---|
| 15.1 | Page title |
| 15.2 | Meta description |
| 15.3 | Keywords |
| 15.4 | OG image for social sharing |

### 16. Analytics — Should

| ID | Requirement |
|---|---|
| 16.1 | Google Analytics or Plausible |
| 16.2 | Goal tracking: contact form, résumé download, GitHub clicks |

### 17. Publishing — Must (17.3 Should)

| ID | Requirement |
|---|---|
| 17.1 | Custom domain |
| 17.2 | Social media metadata |
| 17.3 | Sitemap and robots.txt |

---

## 18. Applies to everything

| ID | Requirement |
|---|---|
| 18.1 | Any section with no content is hidden, never rendered empty |
| 18.2 | Every section can be switched on or off independently |
| 18.3 | Fully usable from 320px mobile width up to desktop |
| 18.4 | Keyboard navigable, alt text on all images, adequate colour contrast. The platform cannot read an embedded third-party card or badge, so it is described rather than transcribed, and where the frame carries no readable text of its own the name and issuer are placed alongside it for screen readers (9.8, 11.8) |
| 18.5 | Content loads fast — images optimised, lazy-loaded below the fold |
| 18.6 | Adding or editing a project takes under 10 minutes and requires no layout changes |
| 18.7 | Owner can update all content alone, with no third party involved |