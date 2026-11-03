# PROJECT.md — Technical guide

This guide describes the current repository implementation. It complements [AGENTS.md](./AGENTS.md), which defines coding-agent responsibilities, and [FLOW.md](./FLOW.md), which follows runtime and user flows.

## 1. Overview

Manoj Mourya’s portfolio is a responsive single-page website for presenting mobile-development work, experience, education, skills, recognition, writing, and contact information. Public content starts from local seed data and can be managed through a Firebase-backed `/admin` workspace. The website can render useful content without a successful Firestore request.

## 2. Technology stack

| Area                 | Implementation                                                               |
| -------------------- | ---------------------------------------------------------------------------- |
| Build and dev server | Vite 7; native ES modules                                                    |
| UI                   | Vanilla JavaScript functions returning HTML strings; one shared `styles.css` |
| Backend              | Firebase Web SDK 12: Authentication, Firestore, Storage                      |
| Markdown             | Repository renderer plus `highlight.js` core and selected language modules   |
| Hosting              | Firebase Hosting serves `dist/` and rewrites SPA paths to `index.html`       |
| Fonts                | DM Sans and DM Mono loaded from Google Fonts with system fallbacks           |

The repository has no UI framework, routing package, state library, TypeScript, lint runner, or test framework. See the actual commands in [Development and deployment](#14-development-build-validation-and-deployment).

## 3. Repository structure

```text
.
├── index.html                    # Document metadata, fallback message, module entry
├── src/
│   ├── app.js                    # Startup, global data state, render, hydration
│   ├── router.js                 # Route-to-template resolution and detail titles
│   ├── components.js             # Shared header/footer/cards/timeline templates
│   ├── data.js                   # Local seed data and site defaults
│   ├── firebase.js               # Firebase initialization and public data reads/cache
│   ├── firebase-config.js        # Public Firebase Web app config
│   ├── interactions.js           # Public navigation, theme, forms, filters, cursor
│   ├── markdown.js               # Safe Markdown rendering, highlighting, copy action
│   ├── project-artwork.js        # Thumbnail-kind selection and inline SVG illustrations
│   ├── utils.js                  # Escaping, slug, route, publication, date helpers
│   ├── pages/                    # One template module per public page family
│   │   ├── home.js
│   │   ├── about.js              # About and experience templates
│   │   ├── projects.js           # Listing, detail, certificates/workshops
│   │   ├── blog.js               # Blog listing and article detail
│   │   └── contact.js            # Contact and 404 templates
│   └── admin/
│       ├── blog-store.js         # Blog list, write, delete, order, cover upload
│       ├── content-schema.js     # Admin sections and field definitions
│       ├── content-store.js      # Other admin content reads, validation, writes
│       ├── content-view.js       # Generic collection/singleton editor UI
│       ├── markdown-editor.js   # Markdown toolbar transformations
│       ├── ui.js                 # Shared admin section header, feedback, actions
│       └── views.js              # Auth states, blog editor/list, admin workspace
├── styles.css                    # Design tokens, all public/admin styling and breakpoints
├── public/                       # Static files served from the site root
├── assets/                       # Repository-level source asset(s)
├── firestore.rules               # Firestore authorization and document validation
├── storage.rules                 # Storage authorization, MIME and byte-size limits
├── firestore.indexes.json        # Firestore index deployment config (currently empty)
├── firebase.json                 # Hosting, Auth-domain/provider, rules configuration
├── .firebaserc                   # Default Firebase project alias
├── vite.config.js                # Build chunk boundaries for Firebase packages
└── docs/                         # Firebase data model and rules review notes
```

`dist/`, `node_modules/`, `.firebase/`, and Firebase debug logs are ignored by Git. Static public assets are referenced with root-relative paths such as `/assets/...`.

## 4. Entry points and initialization

`index.html` provides the initial SEO metadata, favicon, font hints, `#app`, and a helpful server-start screen for direct `file://` launches. Vite loads `src/app.js` as a module. `app.js` imports the global stylesheet, obtains local seeds, sets up delegated Markdown code-copy handling, restores cached blog content, and applies the saved/system theme before rendering.

For public paths it renders once from local state, then loads remote content. For `/admin`, it displays a loading shell and dynamically imports `src/admin.js`, keeping admin/auth code out of the initial route path. The detailed order is diagrammed in [FLOW.md](./FLOW.md#startup-and-public-rendering).

## 5. Routing and page architecture

`src/utils.js:getPath()` reads `location.pathname`, removes a trailing slash, and returns `/` for the root. `src/router.js:resolveRoute(route, data, blogLoadState)` maps fixed paths and `/projects/:slug` or `/blog/:slug` to templates. Detail routes set a route-specific title when the published record exists. Missing records and unknown paths use `notFoundPage()`.

`src/interactions.js:bindInternalNavigation()` handles same-tab internal links with `history.pushState()`, scroll-to-top, and a render callback. Downloads, external contexts, modified clicks, and file-like URLs are left to the browser. `app.js` listens for `popstate`; `firebase.json` rewrites Hosting requests to `/index.html` for deep links.

## 6. Component hierarchy and page trees

There is no framework component lifecycle. A page template receives data and returns HTML. `app.js` wraps that output with shared header/footer markup, assigns it to `#app`, updates metadata, then binds behavior.

### Shared public shell

```text
#app
├── header(data, route)                  src/components.js
│   ├── wordmark/home link
│   ├── desktop navigation with aria-current
│   ├── theme toggle
│   └── mobile menu toggle/navigation
├── selected page template               src/pages/*.js
└── footer(data)                         src/components.js
    ├── wordmark and Admin link
    ├── social links, résumé, contact link
    └── copyright
```

### Home (`/`)

```text
homePage(data)                           src/pages/home.js
├── hero: profile role, intro, portrait, résumé, socials, current focus
├── intro strip: profile biography
├── featured projects: projectCard() × up to 3
├── skill wall: published skillCategories
├── experiencePreview(): timeline() × up to 2
├── achievements / milestones
├── recent blog cards × up to 3
└── contact callout
```

Only published projects with `featured` or legacy `isFeatured` appear in the home project section. Empty skills, projects, experience, milestones, and writing sections are omitted when the corresponding arrays are empty.

### About and experience

`aboutPage(data)` renders a page intro, profile biography/approach, profile portrait, `role`/`primary`/`interests` facts, skill groups, and published education. `experiencePage(data)` renders the published work timeline and education rows. Both use shared `pageIntro()`, `sectionLabel()`, and/or `timeline()` templates.

### Projects and credentials

`projectsPage(data)` renders the intro, search field, category filter buttons, and project grid. Each `projectCard(project, index)` has a detail link and only the external actions available in `project.links` (repository, article/research, live project). `projectArtwork()` selects inline SVG art from category/technology and known project names; `coverImage` replaces the illustration when present.

`projectDetailPage(data, slug)` renders metadata, description/highlights, artwork, technologies, and available link actions. `certificatesPage(data)` renders certificate and workshop/event entries, or an empty learning state.

### Blog

`blogPage(data, loadState)` uses published posts or one of three states: loading, unavailable with `#blog-retry`, or no published posts. `blogDetailPage(data, slug)` renders article metadata, optional cover/tags, and `renderMarkdown(post.content)`. Admin Markdown preview is a manually selected Preview tab; the preview is refreshed when that tab is selected.

### Contact and 404

`contactPage(data)` renders configured social links and an optional phone link beside a native required-fields form. Submitting the form constructs a `mailto:` URL with encoded subject/body; it does not POST to a server. `notFoundPage()` is the SPA fallback for unknown routes and unavailable slugs.

### Admin (`/admin`)

```text
app.js: renderAdmin()
└── import("./admin.js") → mountAdmin(#app)
    ├── Firebase Auth state listener
    ├── login / wrong-owner / unverified / loading states
    └── authenticated workspace (src/admin/views.js)
        ├── section navigation from adminNavigation
        ├── generic content manager (src/admin/content-view.js)
        │   └── fields from adminContentDefinitions
        └── blog list/editor with Markdown tabs and preview
```

`admin.js` owns the mutable screen state and delegated click/input/submit events. It calls the stores for reads/writes and asks views to render. `content-schema.js` is the source of truth for section labels and generic form fields. `ui.js` shares section headers, feedback, and form actions.

## 7. Data sources and flow

`src/data.js` exports `portfolioData`, the local seed for `profile`, `settings`, `projects`, `experience`, `education`, `skillCategories`, `achievements`, `certificates`, `workshops`, and `blogs`. `published()` excludes records with either `published === false` or `isPublished === false` and sorts by `order` (missing order sorts last).

The named Firestore database is `portfolio` in Firebase project `portfolio-3fe77`. `src/firebase.js` reads published collection pipelines for `blogs`, `projects`, `experience`, `education`, `skills`, `skillCategories`, `achievements`, `certificates`, `workshops`, and `socialLinks`. It reads `portfolio/public` and `settings/public` with Firestore Lite. Successful lists map Firestore `isPublished` to the legacy public `published` boolean.

| Content       | Firestore location     | Admin behavior                                                     |
| ------------- | ---------------------- | ------------------------------------------------------------------ |
| Profile       | `portfolio/public`     | Singleton edit form                                                |
| Site settings | `settings/public`      | Singleton form; includes `managedSections`                         |
| Projects      | `projects/{id}`        | CRUD, order, publish, optional cover upload                        |
| Experience    | `experience/{id}`      | CRUD, order, publish                                               |
| Education     | `education/{id}`       | CRUD, order, publish                                               |
| Skills        | `skillCategories/{id}` | CRUD, order, publish; old `skills` records can be grouped publicly |
| Recognition   | `achievements/{id}`    | CRUD, order, publish                                               |
| Certificates  | `certificates/{id}`    | CRUD, order, publish, optional asset                               |
| Workshops     | `workshops/{id}`       | CRUD, order, publish, optional asset                               |
| Blog          | `blogs/{id}`           | Markdown CRUD, order, publish, optional cover                      |

`managedSections` records which collections have been brought under admin management. This distinguishes an intentionally empty published section from a section that should continue to display local seed content. If `socialLinks` is returned, it becomes `profile.socials`; if there is no `skillCategories` result but legacy `skills` are present, `loadRemotePortfolio()` groups the skills by category. Admin content saves use the existing schema and Firebase rules; see [docs/admin-content-data-model.md](./docs/admin-content-data-model.md) and [docs/firebase-admin-rules-review.md](./docs/firebase-admin-rules-review.md).

## 8. Shared modules and responsibilities

| Module                                           | Responsibility                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `components.js`                                  | Shared page shell and reusable cards, timeline, labels, links                                                         |
| `utils.js`                                       | HTML escaping, slugification, path normalization, publication filter/order, date formatting                           |
| `interactions.js`                                | Link interception, theme persistence, mobile menu, project filtering, contact handoff, reveal behavior, custom cursor |
| `markdown.js`                                    | Markdown block/inline parsing, escaping, language highlighting, clipboard copy feedback                               |
| `project-artwork.js`                             | Project-art kind detection and cover/inline-SVG selection                                                             |
| `firebase.js`                                    | Lazy Firebase app/db initialization, public reads, blog cache, remote/seed merge                                      |
| `admin/content-schema.js`                        | Navigation groups and admin form definitions                                                                          |
| `admin/content-view.js`                          | Generic singleton/collection editor and record list templates                                                         |
| `admin/views.js` / `admin/ui.js`                 | Admin screen and shared editor/list feedback templates                                                                |
| `admin/content-store.js` / `admin/blog-store.js` | Admin Firestore/Storage reads, validation, upload, CRUD, and ordering                                                 |
| `admin/markdown-editor.js`                       | Toolbar operations on selected Markdown text                                                                          |

There are no hooks or framework-level stores. Avoid adding duplicate event handlers inside page templates; public interactions are rebound by `bindPageInteractions()` after each render, and admin uses event delegation from the mounted root.

## 9. Styling, themes, and responsiveness

`styles.css` is the single stylesheet. Root CSS custom properties define background, paper/surface, ink/muted/faint text, line, brand/green, typography families, wrapper width, and easing. `:root[data-theme="dark"]` overrides the palette. The theme toggle stores `portfolio-theme`; startup falls back to the OS `prefers-color-scheme` preference.

Public layouts use `.wrap` and CSS Grid/Flexbox; project illustration colors are variables so artwork adapts to both themes. Main responsive breakpoints include 900px and 640px; admin rules also use 800px and 560px. Reduced-motion rules disable transitions/animations and reveal content without scroll animation. Keep new styles in this file and reuse existing tokens and responsive conventions.

## 10. State and event patterns

Public state is a module-level mutable `portfolioData` object, plus `blogLoadState` in `app.js`. Rendering is explicit: state changes call `render()`. Browser listeners are bound after the HTML template is replaced. The app does not use a virtual DOM, hooks, or external state library.

Admin state in `admin.js` tracks the auth user, active section, loaded/loading sections, selected blog/content record, busy status, and notices/errors. Section data is fetched lazily and cached in memory for the session. Writes reload the current section before showing the final result. Ordering is numeric and persisted as `order`; publish status uses `isPublished` and mirrors legacy `published` in saves where applicable.

## 11. Forms, Firebase, and configuration

- The contact form is browser-native validation plus an encoded `mailto:` handoff.
- Admin sign-in/reset/verification uses Firebase Authentication email/password. There is no public sign-up screen. The configured owner email and email-verification claim are checked client-side and enforced again by Firestore/Storage rules.
- Collection reads use Firestore Enterprise pipeline APIs from `firebase/firestore/pipelines`. Fixed singleton reads use Firestore Lite. Admin writes use Firestore `setDoc`, `deleteDoc`, and batches for ordering.
- Blog Markdown supports headings, paragraphs, emphasis, links, images, ordered/unordered/task lists, quotes, tables, rules, and fenced code. Highlighting uses registered highlight.js languages with auto-detection for unknown language names; copy uses `navigator.clipboard`.
- Profile/project/credential/blog asset uploads use Firebase Storage and return download URLs. Client validation checks accepted MIME type and maximum size; the Storage rules repeat authorization/type/size enforcement. Storage must be initialized in the Firebase project before uploads can succeed.
- `src/firebase-config.js` contains public Firebase Web app settings; there are no app environment variables or `.env` templates. `.firebaserc` points Firebase CLI to default project `portfolio-3fe77`; `firebase.json` configures the named `portfolio` Firestore database, rules, Auth provider/domain metadata, Hosting output, and SPA rewrite.
- Firestore fields and allowed shapes are validated in `firestore.rules`. The client-side admin owner check is UX only; security relies on server rules. Read [the existing rules review](./docs/firebase-admin-rules-review.md) before changing access.

## 12. Assets

- `public/favicon.svg` is the browser-tab icon referenced from `index.html`.
- `public/assets/profile-pic.png` is the primary portrait; `public/assets/profile-pic-cutout.png` is the about-page fallback.
- `public/assets/Manoj-Mourya-Resume.pdf` is the local résumé target used by the seed profile.
- `public/` also contains the policy/account-deletion static pages and other static files served directly by Hosting.
- `project-artwork.js` creates inline SVG illustrations; uploaded/hosted `coverImage` values override project art.
- `assets/Manoj-Mourya-Resume.pdf` is a repository-level source asset; site links use the copy in `public/assets/`.

Search for references before renaming/removing an asset. Keep public URLs rooted at `/` so they work in Vite and Firebase Hosting.

## 13. SEO, accessibility, and performance

- `index.html` provides initial title, description, theme color, viewport, and favicon. `app.js` updates `document.title`, description, and `og:image` after each public render; detail pages supply titles from the matched record.
- Semantic headers/nav/main/footer, labels, required form inputs, `aria-current`, `aria-expanded`, tab roles/states, status/alert feedback, descriptive image alt text, and visible focus styles are used across the public/admin UI. Keep these when refactoring.
- Hero portrait uses `fetchpriority="high"`; below-fold project/blog images use lazy loading. Custom cursor and reveal animations are gated for reduced motion/device capabilities. No-JS direct file opening displays a server-start explanation rather than pretending the module app can run from `file://`.
- Vite splits Firestore, Auth, and Storage SDK chunks in `vite.config.js`; the admin module is dynamically imported. Remote content falls back to local seed data and cached blogs to avoid blank public pages.
- Avoid new blocking assets, eager-loading below-fold images, large dependency additions, and unsanitized HTML insertion.

## 14. Development, build, validation, and deployment

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Build, check formatting, and serve the built output locally:

```bash
npm run format:check
npm run build
npm run preview
```

There are no configured lint, type-check, or automated test commands. For UI changes, manually smoke-test the affected route, deep-link refresh behavior, responsive breakpoints, and any relevant interaction in a browser. Admin checks require a configured Firebase project and verified owner account.

Firebase Hosting publishes `dist/`. `.firebaserc` selects the default project. Review `firebase.json`, `firestore.rules`, and `storage.rules` before deployment, then deploy the intended targets with Firebase CLI (for example `firebase deploy --only hosting,firestore,storage`). Storage upload testing requires the bucket to exist. Direct-file opening is unsupported; use the Vite server or deployed Hosting URL.

## 15. Architectural decisions and extension points

- **Templates instead of a UI framework:** small, transparent page functions keep this site dependency-light. Add page templates in `src/pages/` and route them through `src/router.js`.
- **Explicit render/event cycle:** `app.js` rerenders after navigation or data hydration; shared behavior lives in `interactions.js`. Preserve event rebinding and accessibility state when adding interactions.
- **Seed + published remote content:** `data.js` supports immediate rendering and failure fallback; remote collections replace seeds when populated or explicitly marked as managed-empty.
- **Separate blog and portfolio stores:** the blog schema/editor has Markdown and cover-specific behavior; generic content uses schema-driven forms. Extend the correct store rather than merging different validation paths.
- **Rules mirror client fields:** changes to admin fields must be synchronized across `content-schema.js`, save logic, public templates, and Firestore/Storage rules.
- **CSS custom properties define the theme contract:** introduce new colors through tokens and include both theme variants for visual assets.

When these decisions change, update [AGENTS.md](./AGENTS.md), [FLOW.md](./FLOW.md), and this guide in the same change.
