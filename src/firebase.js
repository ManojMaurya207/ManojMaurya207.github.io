import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { execute, field } from 'firebase/firestore/pipelines';
import { firebaseConfig } from './firebase-config.js';

const collectionNames = [
  'projects', 'experience', 'education', 'skills', 'skillCategories',
  'achievements', 'certificates', 'workshops', 'blogs', 'socialLinks'
];
const hasConfig = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
let db;
let app;

export const adminEmail = 'manojkumarmaurya9372@gmail.com';

export function getFirebaseApp() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

function getPortfolioDb() {
  if (!db) db = getFirestore(getFirebaseApp(), 'portfolio');
  return db;
}

export { getPortfolioDb };

function toRows(snapshot) {
  return snapshot.results.map(row => {
    const data = row.data();
    return { ...data, id: row.id, published: data.isPublished === true };
  });
}

// The portfolio uses Firestore Enterprise Pipeline operations for published lists.
// Failed or empty remote collections preserve the local seed content.
export async function loadRemotePortfolio(seed) {
  if (!hasConfig()) return null;
  try {
    const firestore = getPortfolioDb();
    const result = {};
    const reads = collectionNames.map(async name => {
      try {
        const snapshot = await execute(
          firestore.pipeline().collection(name).where(field('isPublished').equal(true))
        );
        const rows = toRows(snapshot);
        if (rows.length) result[name] = rows;
      } catch (error) {
        console.warn(`Firebase collection “${name}” is unavailable; keeping local content.`, error);
      }
    });
    reads.push((async () => {
      try {
        const snapshot = await getDoc(doc(firestore, 'portfolio', 'public'));
        if (snapshot.exists() && snapshot.data().isPublished === true) {
          const profile = snapshot.data();
          result.profile = { ...seed.profile, ...profile, profileImage: profile.profileImage || seed.profile.profileImage };
        }
      } catch (error) {
        console.warn('Firebase profile is unavailable; keeping local content.', error);
      }
    })());
    reads.push((async () => {
      try {
        const snapshot = await getDoc(doc(firestore, 'settings', 'public'));
        if (snapshot.exists() && snapshot.data().isPublished === true) {
          result.settings = { ...seed.settings, ...snapshot.data() };
        }
      } catch (error) {
        console.warn('Firebase settings are unavailable; keeping local content.', error);
      }
    })());
    await Promise.all(reads);
    if (result.socialLinks) {
      result.profile = { ...(result.profile || seed.profile), socials: result.socialLinks };
      delete result.socialLinks;
    }
    if (!result.skillCategories && result.skills?.length) {
      const groups = new Map();
      for (const skill of result.skills) {
        const category = skill.category || 'Other';
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(skill.name || skill.title);
      }
      result.skillCategories = [...groups].map(([name, items]) => ({ name, items }));
    }
    return result;
  } catch (error) {
    console.warn('Firebase initialization failed; using local portfolio content.', error);
    return null;
  }
}
