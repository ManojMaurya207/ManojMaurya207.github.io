import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { execute, field } from "firebase/firestore/pipelines";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { portfolioData } from "../data.js";
import {
  getFirebaseApp,
  getPortfolioDb,
  loadRemoteDocument,
} from "../firebase.js";
import { slugify } from "../utils.js";
import {
  adminContentDefinitions,
  adminSectionsById,
} from "./content-schema.js";

const db = getPortfolioDb();
const storage = getStorage(getFirebaseApp());

export function describeAdminError(
  error,
  fallback = "Could not complete this request.",
) {
  const message = error?.message || fallback;
  const code = String(error?.code || "").toLowerCase();
  if (
    code.includes("permission-denied") ||
    /missing or insufficient permissions/i.test(message)
  ) {
    return "Firestore rejected this write. The owner token is verified; confirm the portfolio database has the latest rules and that the entry matches its form fields.";
  }
  if (
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    /client is offline/i.test(message)
  ) {
    return "Could not reach Firestore from this browser. Check the connection, then retry.";
  }
  return message;
}

export async function loadAdminContent(sectionIds = ["profile", "settings"]) {
  const content = {};
  const errors = {};
  const sections = [...new Set(sectionIds)]
    .map((id) => adminSectionsById[id])
    .filter(Boolean);
  const reads = sections.map(async (section) => {
    try {
      if (section.singleton) {
        const collectionName =
          section.id === "profile" ? "portfolio" : "settings";
        const remoteRecord = await loadRemoteDocument(collectionName, "public");
        content[section.id] = remoteRecord
          ? { ...remoteRecord, id: "public" }
          : section.id === "profile"
            ? { ...portfolioData.profile, isPublished: true }
            : { ...portfolioData.settings, isPublished: true };
        return;
      }

      const result = await execute(
        db
          .pipeline()
          .collection(section.collection)
          .sort(field("order").ascending()),
      );
      content[section.id] = result.results.map((row) => ({
        ...row.data(),
        id: row.id,
      }));
    } catch (error) {
      console.error(
        "Admin Firestore read failed",
        JSON.stringify({
          section: section.id,
          code: error?.code,
          message: error?.message,
        }),
      );
      errors[section.id] = describeAdminError(
        error,
        "Could not load this section.",
      );
      content[section.id] = section.singleton ? null : [];
    }
  });

  await Promise.all(reads);
  return { content, errors };
}

function parseSocials(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([label, url, handle]) => ({ label, url, handle: handle || label }));
}

function writeNested(object, path, value) {
  const keys = path.split(".");
  let cursor = object;
  for (const key of keys.slice(0, -1)) cursor = cursor[key] ||= {};
  cursor[keys.at(-1)] = value;
}

function extensionFor(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return extensions[file.type];
}

function nextRecordId(base, records) {
  const usedIds = new Set(records.map((record) => record.id));
  let candidate = base || "portfolio-entry";
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function settingsWithManagedSection(settings, collectionName) {
  const managedSections = Array.isArray(settings?.managedSections)
    ? [...settings.managedSections]
    : [];
  if (!managedSections.includes(collectionName))
    managedSections.push(collectionName);

  return {
    siteTitle: settings?.siteTitle || portfolioData.settings.siteTitle,
    description: settings?.description || "",
    ogImage: settings?.ogImage || "",
    managedSections,
    isPublished: true,
    published: true,
    order: Number.isInteger(settings?.order) ? settings.order : 1,
    createdAt: settings?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function hasPublishedEntry(records, excludingId) {
  return records.some(
    (record) => record.id !== excludingId && record.isPublished === true,
  );
}

async function uploadField(file, section, recordId, definition) {
  const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowed =
    definition.asset === "pdf"
      ? ["application/pdf"]
      : definition.asset === "document"
        ? [
            ...imageTypes.filter((type) => type !== "image/gif"),
            "application/pdf",
          ]
        : imageTypes;
  const sizeLimit =
    definition.asset === "image" ? 8 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > sizeLimit) {
    throw new Error(`${definition.label} file is too large.`);
  }
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Choose a supported file for ${definition.label.toLowerCase()}.`,
    );
  }

  const directory = definition.scoped
    ? `${definition.folder}/${recordId}`
    : definition.folder;
  const objectRef = ref(
    storage,
    `${directory}/${definition.filename}-${Date.now()}.${extensionFor(file)}`,
  );
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function saveContentRecord(sectionId, form, currentContent) {
  const section = adminSectionsById[sectionId];
  const definition = adminContentDefinitions[sectionId];
  const formData = new FormData(form);
  const existingId = form.dataset.recordId;
  const currentRows = section.singleton
    ? currentContent[sectionId] || {}
    : currentContent[sectionId] || [];
  const existing = section.singleton
    ? currentRows
    : currentRows.find((record) => record.id === existingId);
  const values = existing ? { ...existing } : {};
  if (sectionId === "projects") {
    values.links = { ...(existing?.links || {}) };
  }
  delete values.id;

  for (const fieldDef of definition.fields) {
    if (fieldDef.type === "checkbox") {
      writeNested(values, fieldDef.name, formData.get(fieldDef.name) === "on");
    } else if (fieldDef.type === "list") {
      const items = String(formData.get(fieldDef.name) || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > fieldDef.maxItems) {
        throw new Error(
          `${fieldDef.label} can contain up to ${fieldDef.maxItems} items.`,
        );
      }
      writeNested(values, fieldDef.name, items);
    } else if (fieldDef.type === "socials") {
      const socials = parseSocials(formData.get(fieldDef.name));
      if (socials.length > fieldDef.max) {
        throw new Error(`Use no more than ${fieldDef.max} social links.`);
      }
      writeNested(values, fieldDef.name, socials);
    } else if (fieldDef.type !== "asset") {
      const value = String(formData.get(fieldDef.name) || "").trim();
      if (fieldDef.required && !value)
        throw new Error(`${fieldDef.label} is required.`);
      if (fieldDef.max && value.length > fieldDef.max) {
        throw new Error(
          `${fieldDef.label} must be ${fieldDef.max} characters or shorter.`,
        );
      }
      writeNested(values, fieldDef.name, value);
    } else {
      values[fieldDef.name] = String(formData.get(fieldDef.name) || "").trim();
    }
  }

  if (sectionId === "projects") {
    values.slug = slugify(values.slug || values.title);
    if (!values.slug) throw new Error("Add a URL slug for the project.");
    const collision = currentRows.find(
      (record) => record.slug === values.slug && record.id !== existingId,
    );
    if (collision) throw new Error("That project URL slug is already in use.");
  }

  const order = section.singleton
    ? (existing?.order ?? 1)
    : Number(formData.get("order")) ||
      existing?.order ||
      currentRows.length + 1;
  const isPublished =
    sectionId === "settings" || formData.get("isPublished") === "on";
  values.order = order;
  values.isPublished = isPublished;
  values.published = isPublished;
  if (sectionId === "settings") {
    values.managedSections = Array.isArray(existing?.managedSections)
      ? existing.managedSections
      : [];
  }
  if (existing?.createdAt) values.createdAt = existing.createdAt;
  else values.createdAt = serverTimestamp();
  values.updatedAt = serverTimestamp();

  const slugValue =
    values.slug ||
    slugify(
      values.title ||
        values.name ||
        values.role ||
        values.degree ||
        values.siteTitle ||
        sectionId,
    );
  const recordId = section.singleton
    ? "public"
    : existingId || nextRecordId(slugValue, currentRows);

  for (const fieldDef of definition.fields.filter(
    (item) => item.type === "asset",
  )) {
    const file = formData.get(`upload:${fieldDef.name}`);
    if (file instanceof File && file.size) {
      values[fieldDef.name] = await uploadField(
        file,
        sectionId,
        recordId,
        fieldDef,
      );
    }
    const url = values[fieldDef.name];
    if (url && !url.startsWith("/assets/") && !/^https:\/\//i.test(url)) {
      throw new Error(
        `${fieldDef.label} must be an HTTPS URL or a local /assets/ path.`,
      );
    }
  }

  const collectionName = section.singleton
    ? sectionId === "profile"
      ? "portfolio"
      : "settings"
    : section.collection;
  await setDoc(doc(db, collectionName, recordId), values);

  const publishedEntriesRemain = section.singleton
    ? sectionId !== "profile" || values.isPublished === true
    : hasPublishedEntry(currentRows, recordId) || values.isPublished === true;
  if (sectionId !== "settings" && !publishedEntriesRemain) {
    await markManaged(section, currentContent);
  }
  return { sectionId, recordId, values };
}

export async function deleteContentRecord(sectionId, recordId, currentContent) {
  const section = adminSectionsById[sectionId];
  if (section.singleton)
    throw new Error("Profile and site settings cannot be deleted.");
  const remaining = currentContent[sectionId].filter(
    (item) => item.id !== recordId,
  );
  await deleteDoc(doc(db, section.collection, recordId));
  if (!hasPublishedEntry(remaining)) await markManaged(section, currentContent);
  await reorderContent(sectionId, remaining);
}

async function markManaged(section, currentContent) {
  const settings = currentContent.settings || portfolioData.settings;
  const collectionName = section.collection || section.id;
  const updatedSettings = settingsWithManagedSection(settings, collectionName);
  await setDoc(doc(db, "settings", "public"), updatedSettings);
  currentContent.settings = { ...updatedSettings, id: "public" };
}

export async function reorderContent(sectionId, records) {
  const section = adminSectionsById[sectionId];
  if (section.singleton) return;
  const batch = writeBatch(db);
  records.forEach((record, index) => {
    const { id, ...data } = record;
    batch.set(
      doc(db, section.collection, id),
      { ...data, order: index + 1, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
  if (records.length) await batch.commit();
}

export async function moveContentRecord(
  sectionId,
  recordId,
  direction,
  currentContent,
) {
  const records = [...currentContent[sectionId]].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const currentIndex = records.findIndex((record) => record.id === recordId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= records.length) return;
  [records[currentIndex], records[nextIndex]] = [
    records[nextIndex],
    records[currentIndex],
  ];
  await reorderContent(sectionId, records);
}
