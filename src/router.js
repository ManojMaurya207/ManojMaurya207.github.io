import { aboutPage, experiencePage } from "./pages/about.js";
import { blogDetailPage, blogPage } from "./pages/blog.js";
import { contactPage, notFoundPage } from "./pages/contact.js";
import { homePage } from "./pages/home.js";
import {
  certificatesPage,
  projectDetailPage,
  projectsPage,
} from "./pages/projects.js";
import { published, slugify } from "./utils.js";

export function resolveRoute(route, data, blogLoadState) {
  if (route === "/") return { content: homePage(data) };
  if (route === "/projects") return { content: projectsPage(data) };

  if (route.startsWith("/projects/")) {
    const slug = decodeURIComponent(route.slice("/projects/".length));
    const project = published(data.projects).find(
      (item) => (item.slug || slugify(item.title)) === slug,
    );
    return {
      content: projectDetailPage(data, slug) || notFoundPage(),
      title: project ? `${project.title} — ${data.profile.name}` : undefined,
    };
  }

  if (route === "/about") return { content: aboutPage(data) };
  if (route === "/experience") return { content: experiencePage(data) };
  if (route === "/certificates") return { content: certificatesPage(data) };
  if (route === "/blog") return { content: blogPage(data, blogLoadState) };

  if (route.startsWith("/blog/")) {
    const slug = decodeURIComponent(route.slice("/blog/".length));
    const post = published(data.blogs).find(
      (item) => (item.slug || slugify(item.title)) === slug,
    );
    return {
      content: blogDetailPage(data, slug) || notFoundPage(),
      title: post ? `${post.title} — ${data.profile.name}` : undefined,
    };
  }

  if (route === "/contact") return { content: contactPage(data) };
  return { content: notFoundPage() };
}
