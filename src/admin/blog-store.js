import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { execute } from "firebase/firestore/pipelines";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp, getPortfolioDb } from "../firebase.js";
import { slugify } from "../utils.js";

const db = getPortfolioDb();
const storage = getStorage(getFirebaseApp());

export async function loadBlogPosts() {
  const snapshot = await execute(db.pipeline().collection("blogs"));
  return snapshot.results.map((row) => ({ ...row.data(), id: row.id }));
}

export async function reorderBlogPosts(posts, recordId, direction) {
  const orderedPosts = [...posts].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const currentIndex = orderedPosts.findIndex((post) => post.id === recordId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedPosts.length)
    return;

  [orderedPosts[currentIndex], orderedPosts[nextIndex]] = [
    orderedPosts[nextIndex],
    orderedPosts[currentIndex],
  ];

  const batch = writeBatch(db);
  orderedPosts.forEach((post, index) => {
    const { id, ...data } = post;
    batch.set(doc(db, "blogs", id), {
      ...data,
      order: index + 1,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

function estimateReadingTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function saveBlogPost(form, { selectedPost, posts }) {
  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title).trim());
  const category = String(formData.get("category") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "Use a URL-safe slug with lowercase letters, numbers, and hyphens.",
    );
  }
  if (tags.length > 8 || tags.some((tag) => tag.length > 32)) {
    throw new Error("Use no more than 8 tags, each 32 characters or shorter.");
  }

  const conflict = posts.find(
    (post) => post.slug === slug && post.id !== selectedPost?.id,
  );
  if (conflict)
    throw new Error("That URL slug is already used by another article.");

  const id = selectedPost?.id || doc(collection(db, "blogs")).id;
  const existing = posts.find((post) => post.id === id);
  let coverImage = String(formData.get("coverImage") || "").trim();
  const file = formData.get("coverFile");

  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Cover images must be 5 MB or smaller.");

    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[file.type];
    if (!extension) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");

    const objectRef = ref(storage, `blogs/${id}/cover.${extension}`);
    await uploadBytes(objectRef, file, { contentType: file.type });
    coverImage = await getDownloadURL(objectRef);
  }

  if (coverImage && !/^https:\/\//i.test(coverImage))
    throw new Error("Cover image URLs must use HTTPS.");

  await setDoc(doc(db, "blogs", id), {
    title,
    slug,
    category,
    excerpt,
    content,
    coverImage,
    tags,
    readingTime: estimateReadingTime(content),
    isPublished: formData.get("isPublished") === "on",
    order:
      existing?.order ??
      Math.max(0, ...posts.map((post) => post.order || 0)) + 1,
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function deleteBlogPost(postId) {
  return deleteDoc(doc(db, "blogs", postId));
}
