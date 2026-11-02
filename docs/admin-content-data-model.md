# Admin content model and Firestore access notes

The portfolio uses the Firebase project `portfolio-3fe77` and its named Firestore Enterprise database `portfolio` in `asia-south1`. The web SDK uses Enterprise pipelines for collection reads and Firestore Lite REST reads for the profile and site settings singleton documents.

## Content locations

| Admin area | Firestore path | Public representation |
| --- | --- | --- |
| Profile | `portfolio/public` | `profile` |
| Site settings | `settings/public` | page title, description, sharing image, plus `managedSections` |
| Projects | `projects/{slug}` | `projects[]` |
| Experience | `experience/{slug}` | `experience[]` |
| Education | `education/{slug}` | `education[]` |
| Skills | `skillCategories/{slug}` | `skillCategories[]` |
| Recognition | `achievements/{slug}` | `achievements[]` |
| Certificates | `certificates/{slug}` | `certificates[]` |
| Workshops | `workshops/{slug}` | `workshops[]` |
| Blog | `blogs/{id}` | `blogs[]` |

Collection records use `isPublished` and numeric `order`. Some existing documents also have a legacy `published` boolean, which the admin mirrors for compatibility with the public data helper. Single-document profile and settings records have a publication state; ordering applies to their child lists such as social links. Public collection queries filter to `isPublished == true` and sort by `order`. Admin collection reads are unrestricted only for the verified portfolio owner.

`settings/public.managedSections` identifies collections that have been moved into Admin control. It lets the public site treat an intentionally empty published result as empty instead of showing its local starter data. Existing populated Firestore collections continue to override local starter content.

## Field groups

- Profile: name, initials, role, location, current focus, primary platform/specialty, interests, intro, biography, public email/phone, profile image URL, résumé URL, ordered socials, publication/order metadata.
- Site settings: site title, search description, social sharing image, publication/order metadata, managed section names.
- Projects: title, slug, category, summary, description, technologies, highlights, repository/article/live links, cover image and alt text, featured flag, publication/order metadata.
- Experience: role, company, company URL, location, employment type, dates, description, technologies, publication/order metadata.
- Education: degree, institution, location, dates, description, publication/order metadata.
- Skill categories: name, ordered items, publication/order metadata.
- Recognition: title, organization, year, optional URL, publication/order metadata.
- Certificates: name, issuer, issue date, description, credential URL/document, publication/order metadata.
- Workshops: title, organization, year, location, description, URL/document, publication/order metadata.
- Blogs: existing validated Markdown schema, plus `order` for public/admin display order.

## Read and write operations

- Public portfolio collection reads use Enterprise pipelines with `where(isPublished == true)` followed by `sort(order ascending)`.
- Admin reads use Enterprise pipelines over the same named collections and Firestore Lite reads for the two singleton records. Lite avoids the Core SDK transport failure that reported this browser as offline.
- Admin writes use one `setDoc` per content entry, matching the working blog save path; ordering remains a batch because it updates multiple records. `settings/public.managedSections` is written separately only when a section has no published entries, so it cannot make ordinary profile, project, experience, education, skill, or credential saves fail as a side effect. Blog uploads and content uploads use Firebase Storage download URLs.
- Project links and cover images continue to feed the existing project card/detail renderers. Profile fields feed the home, about, header, footer, and contact views.

## Storage paths

- `profile/{file}`: portrait, résumé PDF, and social share image.
- `projects/{projectId}/{file}`: project cover images.
- `certificates/{entryId}/{file}`: certificate and workshop files.
- `blogs/{blogId}/{file}`: existing article cover images.

Firebase Storage must be initialized in the Firebase Console before file uploads can work. Until then, the editor also accepts hosted HTTPS URLs and local `/assets/` paths.

## Security review notes

The Firebase rules were reviewed against all Firestore and Storage call sites in `src/firebase.js`, `src/admin.js`, and `src/admin-content.js`, plus the current document shapes in the named `portfolio` database.

| Surface | Public access | Admin access | Guardrails |
| --- | --- | --- | --- |
| Profile and settings | Read the published singleton document | Read and write only for the verified owner email | Strict allowed-field lists, type/length limits, HTTPS or local asset URLs, `order` range |
| Portfolio collections | Read published entries; public queries must filter `isPublished == true` | Read, create, update, and delete | Per-collection schema checks, bounded lists/text, URL validation, publication boolean, order range |
| Blog | Read published entries | Read and manage drafts and published entries | Existing Markdown limits and tag bounds, slug format, timestamp and order checks |
| Storage | Public reads for assets linked from public pages | Upload, replace, and delete only for the verified owner | Content-type allowlists and maximum sizes by folder |

The fixed owner identity matches the existing `/admin` gate and Firebase Auth setup: `manojkumarmaurya9372@gmail.com` with `email_verified == true`. Frontend checks are only for the admin experience; Firestore and Storage rules enforce the same owner boundary on the server.

The admin refreshes the verified owner's Firebase ID token before loading or mutating content, then checks the refreshed token claims against the owner email and `email_verified` rule. The Firebase CLI config lists `portfolio` as a named database entry; the current Firestore rules release was deployed to that database.

### Adversarial review

- A visitor cannot publish a draft or change ordering because every content write requires the verified owner identity.
- A signed-in non-owner cannot read drafts or write public content; the database rules check the token email, not a client-supplied profile field.
- A public query that does not constrain each returned record to `isPublished == true` is denied by the collection read rule.
- Malformed or oversized content is rejected by field, list, URL, and order validation. File uploads are separately checked for MIME type and byte size.
- Portfolio assets are intentionally public. Anyone who can see a published résumé, image, or credential link can fetch that file; private documents should not be uploaded here.
- The admin identity is intentionally bound to one email. Changing account ownership requires updating the rules and the frontend admin configuration together.

Security Rules validation passed for both `firestore.rules` and `storage.rules`. The Firestore rules have been deployed. Storage rule deployment is pending because Cloud Storage has not been initialized in the Firebase project; Firebase Console must create the bucket first. Firebase rules are default-deny for paths not explicitly matched. Review the owner identity and public asset behavior before changing the portfolio to a different owner or storing private files.
