export const adminNavigation = [
  {
    label: "PROFILE & SITE",
    sections: [
      { id: "profile", label: "Profile", singleton: true },
      { id: "settings", label: "Site settings", singleton: true },
    ],
  },
  {
    label: "PROJECTS",
    sections: [{ id: "projects", label: "Projects", collection: "projects" }],
  },
  {
    label: "EXPERIENCE & EDUCATION",
    sections: [
      { id: "experience", label: "Experience", collection: "experience" },
      { id: "education", label: "Education", collection: "education" },
    ],
  },
  {
    label: "SKILLS & CREDENTIALS",
    sections: [
      {
        id: "skills",
        label: "Skills",
        collection: "skillCategories",
      },
      { id: "achievements", label: "Recognition", collection: "achievements" },
      { id: "certificates", label: "Certificates", collection: "certificates" },
      { id: "workshops", label: "Workshops", collection: "workshops" },
    ],
  },
];

export const adminContentDefinitions = {
  profile: {
    title: "Profile",
    description: "The personal details used across your portfolio.",
    fields: [
      { name: "name", label: "Name", required: true, max: 100 },
      { name: "initials", label: "Monogram", required: true, max: 6 },
      { name: "role", label: "Role", required: true, max: 140 },
      { name: "location", label: "Location", max: 100 },
      { name: "currentlyBuilding", label: "Current focus", max: 180 },
      {
        name: "primary",
        label: "Primary platform or specialty",
        max: 140,
        default: "Android · Kotlin",
      },
      {
        name: "interests",
        label: "Interests",
        max: 180,
        default: "Mobile · AI · Computer vision",
      },
      { name: "intro", label: "Introduction", type: "textarea", max: 500 },
      { name: "bio", label: "About biography", type: "textarea", max: 2000 },
      { name: "email", label: "Public email", type: "email", max: 200 },
      { name: "phone", label: "Public phone (optional)", type: "tel", max: 40 },
      {
        name: "profileImage",
        label: "Profile image",
        type: "asset",
        asset: "image",
        folder: "profile",
        filename: "portrait",
      },
      {
        name: "resumeUrl",
        label: "Résumé PDF",
        type: "asset",
        asset: "pdf",
        folder: "profile",
        filename: "resume",
      },
      {
        name: "socials",
        label: "Social links",
        type: "socials",
        max: 10,
        help: "One per line: label | URL | short handle. Lines set the public display order.",
      },
    ],
  },
  settings: {
    title: "Site settings",
    description:
      "Control your page title, search description, and share image.",
    fields: [
      { name: "siteTitle", label: "Site title", required: true, max: 140 },
      {
        name: "description",
        label: "Search description",
        type: "textarea",
        max: 320,
      },
      {
        name: "ogImage",
        label: "Social sharing image",
        type: "asset",
        asset: "image",
        folder: "profile",
        filename: "social-card",
      },
    ],
  },
  projects: {
    title: "Projects",
    fields: [
      { name: "title", label: "Project name", required: true, max: 120 },
      { name: "slug", label: "URL slug", required: true, max: 140 },
      { name: "category", label: "Category", required: true, max: 60 },
      { name: "summary", label: "Card summary", type: "textarea", max: 320 },
      {
        name: "description",
        label: "Project details",
        type: "textarea",
        max: 4000,
      },
      {
        name: "technologies",
        label: "Technologies",
        type: "list",
        maxItems: 24,
      },
      { name: "highlights", label: "Highlights", type: "list", maxItems: 12 },
      {
        name: "links.github",
        label: "Repository URL",
        type: "url",
        max: 2048,
      },
      {
        name: "links.githubLabel",
        label: "Repository button label",
        max: 60,
      },
      {
        name: "links.paper",
        label: "Article or research URL",
        type: "url",
        max: 2048,
      },
      {
        name: "links.paperLabel",
        label: "Article button label",
        max: 60,
      },
      {
        name: "links.article",
        label: "Alternate article URL",
        type: "url",
        max: 2048,
      },
      { name: "links.articleLabel", label: "Alternate article label", max: 60 },
      { name: "links.research", label: "Research URL", type: "url", max: 2048 },
      { name: "links.researchLabel", label: "Research button label", max: 60 },
      { name: "links.live", label: "Live project URL", type: "url", max: 2048 },
      { name: "links.liveLabel", label: "Live button label", max: 60 },
      {
        name: "coverImage",
        label: "Project cover image",
        type: "asset",
        asset: "image",
        folder: "projects",
        filename: "cover",
        scoped: true,
      },
      { name: "coverImageAlt", label: "Cover image description", max: 180 },
      { name: "featured", label: "Feature on home page", type: "checkbox" },
    ],
  },
  experience: {
    title: "Experience",
    fields: [
      { name: "role", label: "Role", required: true, max: 140 },
      { name: "company", label: "Company", required: true, max: 140 },
      { name: "companyUrl", label: "Company URL", type: "url", max: 2048 },
      { name: "location", label: "Location", max: 120 },
      { name: "employmentType", label: "Employment type", max: 80 },
      { name: "startDate", label: "Start date", max: 80 },
      { name: "endDate", label: "End date", max: 80 },
      { name: "description", label: "Details", type: "textarea", max: 4000 },
      {
        name: "technologies",
        label: "Tools and technologies",
        type: "list",
        maxItems: 24,
      },
    ],
  },
  education: {
    title: "Education",
    fields: [
      { name: "degree", label: "Degree or program", required: true, max: 160 },
      { name: "institution", label: "Institution", required: true, max: 200 },
      { name: "location", label: "Location", max: 140 },
      { name: "startDate", label: "Start date", max: 80 },
      { name: "endDate", label: "End date", max: 80 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
    ],
  },
  skills: {
    title: "Skills",
    fields: [
      { name: "name", label: "Group name", required: true, max: 80 },
      {
        name: "items",
        label: "Skills in this group",
        type: "list",
        maxItems: 32,
      },
    ],
  },
  achievements: {
    title: "Recognition",
    fields: [
      { name: "title", label: "Award or milestone", required: true, max: 180 },
      { name: "organization", label: "Organization or detail", max: 180 },
      { name: "year", label: "Year", max: 40 },
      { name: "url", label: "More information URL", type: "url", max: 2048 },
    ],
  },
  certificates: {
    title: "Certificates",
    fields: [
      { name: "name", label: "Certificate name", required: true, max: 180 },
      { name: "issuer", label: "Issuing organization", max: 140 },
      { name: "issuedAt", label: "Issue date or year", max: 60 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
      { name: "url", label: "Credential URL", type: "url", max: 2048 },
      {
        name: "documentUrl",
        label: "Certificate file",
        type: "asset",
        asset: "document",
        folder: "certificates",
        filename: "credential",
        scoped: true,
      },
    ],
  },
  workshops: {
    title: "Workshops & events",
    fields: [
      { name: "title", label: "Workshop or event", required: true, max: 180 },
      { name: "organization", label: "Organization", max: 140 },
      { name: "year", label: "Year", max: 40 },
      { name: "location", label: "Location", max: 140 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
      { name: "url", label: "More information URL", type: "url", max: 2048 },
      {
        name: "documentUrl",
        label: "Related file",
        type: "asset",
        asset: "document",
        folder: "certificates",
        filename: "workshop",
        scoped: true,
      },
    ],
  },
};

const adminSectionsById = Object.fromEntries(
  adminNavigation
    .flatMap((group) => group.sections)
    .map((section) => [section.id, section]),
);

export { adminSectionsById };
