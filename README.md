# Manoj Mourya Portfolio

Responsive portfolio built with Vite and Firebase. The local seed in `src/data.js` keeps the site usable if Firebase is unavailable; published Firestore content replaces it when present.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. Firebase Hosting serves the generated `dist` directory.

## Firebase project

This workspace is connected to the existing `portfolio-3fe77` project and its Enterprise Native Firestore database named `portfolio` in Mumbai (`asia-south1`). The Firebase Web app configuration is in `src/firebase-config.js`; it is public client configuration, while Firestore and Storage Security Rules control data access.

The site reads published documents from `projects`, `experience`, `education`, `skills`, `skillCategories`, `achievements`, `certificates`, `workshops`, `socialLinks`, and `blogs`. The profile and site settings are the `portfolio/public` and `settings/public` documents. Content documents require `isPublished: true`; optional `order` values control display order. Project and blog documents can include `slug`; project documents can include `coverImage` and `coverImageAlt`.

## Admin blog editor

Open `/admin` from the local site or deployed Hosting URL. The editor supports email/password sign-in for the verified owner account, create/edit/delete, draft and published states, Markdown article text, tags, reading-time calculation, HTTPS cover-image URLs, and optional JPEG/PNG/WebP/GIF cover uploads to `blogs/{documentId}/` in Storage. Public registration is not provided. The admin panel reads drafts through Enterprise Pipeline operations. The email/password provider is enabled in the existing Firebase project; admin writes require deploying the Firestore and Storage rules. The rules restrict writes and draft reads to the verified owner email configured in `firebase.json` and the rules files.

Firestore Pipeline operations read the published lists from the Enterprise database. The deployed Firestore rules allow public reads of published portfolio content and restrict blog drafts and writes to the verified owner account. Storage is not initialized in the Firebase project yet, so blog image uploads are unavailable; use HTTPS cover-image URLs until Storage is enabled and its rules are deployed.

Build before deploying Hosting with the Firebase tools. Review the rules in `firestore.rules` and `storage.rules` and deploy them to the connected project. Hosting rewrites support routes such as `/projects/stealthshield`.

## Content

The résumé download is served from `public/assets/Manoj-Mourya-Resume.pdf`. Portfolio copy and links are based on the supplied brief and résumé. Phone contact details are omitted from the public profile; the requested email and social links remain available.
