# AGENTS.md — Portfolio coding instructions

## Role and objectives

Act as the senior frontend engineer and software architect responsible for maintaining this portfolio. Keep the site professional, performant, accessible, responsive, and easy to maintain. Preserve the portfolio’s visual identity and existing user-facing behavior unless the task explicitly asks for a change.

For the complete runtime and page flow, read [FLOW.md](./FLOW.md). For the source map, data model, design system, integrations, and deployment notes, read [PROJECT.md](./PROJECT.md).

## Repository conventions

- This is a Vite application using native JavaScript ES modules and HTML-string templates. It does not use React, Vue, TypeScript, or a component framework.
- `index.html` loads `src/app.js`; `app.js` initializes the public application and lazy-loads `src/admin.js` only on `/admin`.
- Keep routing in `src/router.js`; shared page-shell components in `src/components.js`; page templates in `src/pages/`; public state and seed content in `src/data.js`; Firebase reads in `src/firebase.js`; and browser behaviors in `src/interactions.js`.
- Keep admin responsibilities separated: `src/admin.js` coordinates auth, state, delegated events, and rendering; `src/admin/content-schema.js` defines sections and fields; `content-view.js`, `views.js`, and `ui.js` render forms and screens; `content-store.js` and `blog-store.js` perform persistence; `markdown-editor.js` handles Markdown formatting.
- `src/markdown.js` owns Markdown rendering, syntax highlighting, and code-copy behavior. `src/project-artwork.js` owns project thumbnail selection and inline SVG illustrations. `src/utils.js` owns shared escaping, slug, route, publication, and date helpers. `styles.css` is the shared stylesheet and design system.
- Firestore collection names and document fields are an existing contract with `firestore.rules`, `storage.rules`, the admin schema, and public renderers. Review those together before changing a data shape. See [the admin data model](./docs/admin-content-data-model.md).

## Coding standards

- Use ES modules, `camelCase` for JavaScript functions and variables, `PascalCase` only for actual classes, `kebab-case` for CSS classes, and the established `camelCase` Firestore field names.
- Match the repository’s Prettier style: two-space indentation, double-quoted JavaScript strings, semicolons, and trailing commas where formatted by Prettier. Run `npm run format:check`; use `npx prettier --write <files>` when formatting changed files.
- There is no TypeScript configuration or TypeScript source. Keep changes in JavaScript unless the task explicitly requires a TypeScript migration. If TypeScript is introduced, add and document a strict type-check command rather than implying that one already exists.
- Page and component functions should remain focused template functions. They return markup and do not own Firebase calls or global event wiring. Put reusable markup in `components.js` or `src/admin/ui.js`; put browser behavior in the existing interaction/controller modules.
- Escape user, Firestore, or other dynamic text with `escapeHtml` (`esc`) before placing it in HTML templates. Preserve the escaping and URL validation patterns in the Markdown and content-store code. Do not insert untrusted data into `innerHTML` without an established safe renderer.
- Prefer existing helpers, field definitions, shared styles, and Firebase modules over parallel implementations. Add dependencies only when the task cannot be handled well with the current browser APIs and installed packages.

## Design preservation

Keep the current typography, spacing, colors, project-art style, light/dark theme, cursor behavior, navigation states, and responsive layouts consistent. The main responsive breakpoints are in `styles.css` (notably 900px and 640px; admin layout also uses 800px and 560px). Check desktop and narrow layouts when a change touches shared layout or navigation. Respect existing reduced-motion behavior. Change tokens or interactions only when requested or necessary to fix a documented defect.

## Development workflow

1. Inspect the relevant source, data definitions, rules, and existing documentation before editing. Use `rg`/`rg --files`; do not infer that a component or command exists from convention.
2. Identify the smallest set of files that owns the behavior. State assumptions when the source leaves an important behavior unclear.
3. Implement the change in the owning module, preserve public data contracts, and update `FLOW.md` or `PROJECT.md` when the architecture or flow changes.
4. Validate the production build and formatting. For UI changes, run the local Vite server and smoke-test the affected route and responsive state when browser access is available.
5. Review the diff for unrelated changes, broken relative links, unsafe template interpolation, stale documentation, and whitespace errors before reporting completion.

## Validation commands

Available scripts from `package.json`:

```bash
npm run dev
npm run build
npm run preview
npm run format:check
npm run format
```

Use `npm run build` and `npm run format:check` for normal code changes. `npm run preview` serves the built `dist/` output for a production-like browser smoke test. There are currently no `lint`, `typecheck`, or `test` scripts and no configured test runner; do not report those checks as run or invent a command that does not exist. If adding one of those toolchains is explicitly needed, add the script and document it here and in [PROJECT.md](./PROJECT.md).

## Restrictions

- Do not add unnecessary dependencies, duplicate renderers/stores/helpers, or move responsibilities across modules without a concrete reason.
- Do not make unrelated UI, content, Firebase, or deployment changes while addressing a focused task.
- Do not change Firestore collection/document shapes or authentication boundaries without updating the schema, public consumers, Firestore/Storage rules, and [the data-model notes](./docs/admin-content-data-model.md) together.
- Do not commit credentials or private data. `src/firebase-config.js` contains public web-app configuration; authorization belongs in Firebase Auth and the deployed rules, not in client-side secrets.
- Do not document unimplemented features, routes, scripts, or integrations as if they exist. Record architectural deviations and their reason in [PROJECT.md](./PROJECT.md).
