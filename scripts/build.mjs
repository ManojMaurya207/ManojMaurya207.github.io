import { readFile, writeFile } from "node:fs/promises";
import { build } from "vite";
import { firebaseConfig } from "../src/firebase-config.js";

const fallbackDescription =
  "Mobile developer building healthcare and utility applications with Swift, SwiftUI, Kotlin, and Jetpack Compose.";
const fallbackTitle = "Manoj Mourya — Mobile Application Developer";
const fallbackImage = "/assets/profile-pic.png";

function getSiteUrl() {
  if (process.env.PORTFOLIO_SITE_URL) {
    return new URL(process.env.PORTFOLIO_SITE_URL).href;
  }

  const [owner, repository] = (
    process.env.GITHUB_REPOSITORY || "ManojMaurya207/ManojMaurya207.github.io"
  ).split("/");
  const hostname = `${owner.toLowerCase()}.github.io`;
  const path = repository.toLowerCase() === hostname ? "" : `${repository}/`;
  return new URL(path, `https://${hostname}/`).href;
}

function readField(fields, name) {
  const field = fields?.[name];
  if (typeof field?.stringValue === "string") return field.stringValue;
  if (typeof field?.booleanValue === "boolean") return field.booleanValue;
  return undefined;
}

async function getPublishedSettings() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;

  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/portfolio/documents/settings/public`,
  );
  endpoint.searchParams.set("key", firebaseConfig.apiKey);

  const response = await fetch(endpoint, {
    headers: { referer: getSiteUrl() },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Firestore returned HTTP ${response.status}.`);
  }

  const document = await response.json();
  const fields = document.fields || {};
  if (readField(fields, "isPublished") !== true) return null;

  return {
    title: readField(fields, "siteTitle"),
    description: readField(fields, "description"),
    image: readField(fields, "ogImage"),
  };
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setMeta(html, attribute, name, value) {
  const pattern = new RegExp(
    `<meta\\s+([^>]*\\b${attribute}\\s*=\\s*["']${escapeRegExp(name)}["'][^>]*)>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return html;

  const content = escapeAttribute(value);
  const attributes = /\scontent=(['"]).*?\1/i.test(match[1])
    ? match[1].replace(/\scontent=(['"]).*?\1/i, ` content="${content}"`)
    : `${match[1]} content="${content}"`;
  return html.replace(pattern, `<meta ${attributes}>`);
}

function imageUrl(value, siteUrl) {
  const candidate = value || fallbackImage;
  try {
    const url = new URL(candidate, siteUrl);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("The social image URL must use public HTTPS.");
    }
    return url.href;
  } catch (error) {
    console.warn(`Ignoring the configured social image: ${error.message}`);
    return new URL(fallbackImage, siteUrl).href;
  }
}

function applyMetadata(html, settings, siteUrl) {
  const title = settings?.title?.trim() || fallbackTitle;
  const description = settings?.description?.trim() || fallbackDescription;
  const image = imageUrl(settings?.image, siteUrl);
  const values = [
    ["property", "og:type", "website"],
    ["name", "description", description],
    ["property", "og:site_name", title],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", siteUrl],
    ["property", "og:image", image],
    ["property", "og:image:alt", "Manoj Mourya"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", image],
  ];

  let output = html.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeAttribute(title)}</title>`,
  );
  return values.reduce(
    (result, [attribute, name, value]) =>
      setMeta(result, attribute, name, value),
    output,
  );
}

await build();

const siteUrl = getSiteUrl();
let settings = null;
try {
  settings = await getPublishedSettings();
  if (settings) {
    console.info("Using published Firebase site settings for share metadata.");
  } else {
    console.info(
      "Using default share metadata; no published site settings found.",
    );
  }
} catch (error) {
  console.warn(
    `Could not load Firebase site settings during build (${error.message}); using default share metadata.`,
  );
}

const htmlPath = new URL("../dist/index.html", import.meta.url);
const html = await readFile(htmlPath, "utf8");
await writeFile(htmlPath, applyMetadata(html, settings, siteUrl));
