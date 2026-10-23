import { blogCard, pageIntro } from "../components.js";
import {
  escapeHtml as esc,
  formatBlogDate,
  published,
  slugify,
} from "../utils.js";
import { renderMarkdown } from "../markdown.js";

export function blogPage(data, loadState) {
  const posts = published(data.blogs);
  const emptyState = getEmptyState(loadState);
  const content = posts.length
    ? `<div class="blog-list">${posts.map(blogCard).join("")}</div>`
    : emptyState;

  return `<main>${pageIntro("NOTES & IDEAS / 05", "Writing", "Occasional notes on mobile development, design, and the things I’m learning.")}<section class="wrap page-content">${content}</section></main>`;
}

function getEmptyState({ status, error }) {
  if (status === "loading") {
    return `<div class="quiet-empty"><span class="mono">NOTES LOADING</span><h2>Loading recent<br>notes.</h2><p>Published writing will appear here in a moment.</p></div>`;
  }
  if (status === "error") {
    return `<div class="quiet-empty"><span class="mono">COULD NOT LOAD NOTES</span><h2>Notes are temporarily<br>unavailable.</h2><p>${esc(error || "The published posts could not be loaded.")} Try again in a moment.</p><button class="text-link" id="blog-retry" type="button">Reload notes ↻</button></div>`;
  }
  return `<div class="quiet-empty"><span class="mono">NOTES / 00</span><h2>Nothing published<br>just yet.</h2><p>When there’s something worth sharing, you’ll find it here.</p></div>`;
}

export function blogDetailPage(data, slug) {
  const post = published(data.blogs).find(
    (item) => (item.slug || slugify(item.title)) === slug,
  );
  if (!post) return null;

  const date = formatBlogDate(
    post.date || post.publishedAt || post.updatedAt || post.createdAt,
  );
  const coverImage = post.coverImage
    ? `<img class="article-cover" src="${esc(post.coverImage)}" alt="${esc(post.coverImageAlt || `${post.title} cover image`)}">`
    : "";
  const tags = post.tags?.length
    ? `<div class="tag-list article-tags">${post.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>`
    : "";

  return `<main>
    <div class="detail-top wrap"><a class="back-link" href="/blog">← All writing</a><span class="mono">${esc(post.category || "ARTICLE")}</span></div>
    <article class="article wrap">
      <span class="mono">${esc(date)}${post.readingTime ? ` · ${esc(post.readingTime)} MIN READ` : ""}</span>
      <h1>${esc(post.title)}<span class="accent-dot">.</span></h1>
      <p class="article-excerpt">${esc(post.excerpt || "")}</p>
      ${coverImage}
      <div class="article-content">${renderMarkdown(post.content)}</div>
      ${tags}
    </article>
  </main>`;
}
