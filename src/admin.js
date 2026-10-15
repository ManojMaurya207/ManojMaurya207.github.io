import { getAuth, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { execute } from 'firebase/firestore/pipelines';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { adminEmail, getFirebaseApp, getPortfolioDb } from './firebase.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 140);
const auth = getAuth(getFirebaseApp());
const db = getPortfolioDb();
const storage = getStorage(getFirebaseApp());
const state = { user: undefined, blogs: [], selected: null, busy: false, notice: '', authError: '', loading: false };
let root;

function isOwnerAccount(user) {
  return Boolean(user?.email?.toLowerCase() === adminEmail);
}

function isAdmin(user) {
  return Boolean(isOwnerAccount(user) && user.emailVerified);
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
    : 'Not saved yet';
}

function renderLogin() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><a class="back-link" href="/">← Back to portfolio</a></div><section class="admin-login"><span class="mono">PRIVATE AREA / BLOG</span><h1>Sign in to<br>manage writing<span class="accent-dot">.</span></h1><p>This area is restricted to the portfolio owner. Sign in with the owner email and password.</p>${state.authError?`<div class="admin-alert" role="alert">${esc(state.authError)}</div>`:''}<form id="admin-login" class="admin-form"><label>Email address<input name="email" type="email" autocomplete="username" required value="${esc(adminEmail)}" placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required placeholder="Your password"></label><button class="button button-dark admin-login-submit" type="submit" ${state.busy?'disabled':''}>${state.busy?'Signing in…':'Sign in'} <span>↗</span></button><button class="admin-reset" type="button" data-action="reset-password" ${state.busy?'disabled':''}>Forgot password?</button></form><a class="admin-back" href="/">Return to portfolio</a></section><p class="admin-footnote">PRIVATE CONTENT IS ONLY VISIBLE TO THE ADMIN ACCOUNT</p></main>`;
}

function renderDenied() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">ACCESS RESTRICTED</span><h1>This account<br>is not an admin<span class="accent-dot">.</span></h1><p>Signed in as <strong>${esc(state.user?.email || 'unknown account')}</strong>. The admin panel is restricted to the portfolio owner account.</p><button class="button button-outline" data-action="sign-out">Sign out</button></section></main>`;
}

function renderUnverified() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">EMAIL VERIFICATION REQUIRED</span><h1>Verify your<br>email<span class="accent-dot">.</span></h1><p><strong>${esc(state.user?.email || adminEmail)}</strong> is the owner account, but Firebase hasn’t marked its email as verified yet. Verify it before opening the admin panel.</p>${state.authError?`<div class="admin-alert" role="status">${esc(state.authError)}</div>`:''}<div class="admin-form"><button class="button button-dark admin-login-submit" data-action="resend-verification" ${state.busy?'disabled':''}>${state.busy?'Sending…':'Resend verification email'} <span>↗</span></button><button class="button button-outline" data-action="check-verification" ${state.busy?'disabled':''}>I’ve verified it — check again</button><button class="admin-reset" data-action="sign-out">Sign out and return to login</button></div></section></main>`;
}

function renderList() {
  const posts = [...state.blogs].sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  const list = posts.length ? posts.map(post => `<article class="admin-post"><div class="admin-post-main"><span class="mono">${esc(post.category || 'ARTICLE')} · ${esc(formatDate(post.updatedAt))}</span><h3>${esc(post.title || 'Untitled')}</h3><p>${esc(post.excerpt || 'No excerpt added.')}</p></div><div class="admin-post-state"><span class="admin-status ${post.isPublished?'is-live':''}">${post.isPublished?'Published':'Draft'}</span><button class="admin-quiet" data-action="edit" data-id="${esc(post.id)}">Edit</button><button class="admin-quiet danger-text" data-action="delete" data-id="${esc(post.id)}">Delete</button></div></article>`).join('') : `<div class="admin-empty"><span class="mono">NO ARTICLES YET</span><p>Create a post to start your writing archive.</p></div>`;
  return `<section class="admin-list"><div class="admin-section-head"><div><span class="mono">BLOG / ${String(posts.length).padStart(2,'0')} ARTICLES</span><h2>Your writing</h2></div><button class="button button-dark" data-action="new">New article <span>＋</span></button></div>${state.notice?`<div class="admin-notice" role="status">${esc(state.notice)}</div>`:''}${state.loading?'<p class="admin-loading">Loading articles…</p>':`<div class="admin-post-list">${list}</div>`}</section>`;
}

function renderEditor() {
  const post = state.selected || {};
  const editing = Boolean(post.id);
  const tags = Array.isArray(post.tags) ? post.tags.join(', ') : '';
  return `<section class="admin-editor"><div class="admin-section-head"><div><span class="mono">${editing?'EDIT ARTICLE':'NEW ARTICLE'}</span><h2>${editing?esc(post.title || 'Untitled'):'Draft a story'}</h2></div><button class="admin-quiet" data-action="cancel">← Back to posts</button></div><form id="blog-editor" class="admin-form">
    <div class="admin-form-grid"><label>Title<input name="title" maxlength="120" required value="${esc(post.title)}" placeholder="A clear, useful headline"></label><label>URL slug<input name="slug" maxlength="140" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(post.slug)}" placeholder="generated-from-title"></label></div>
    <div class="admin-form-grid"><label>Category<input name="category" maxlength="40" required value="${esc(post.category)}" placeholder="Android, Firebase, Career…"></label><label>Tags<input name="tags" value="${esc(tags)}" placeholder="Kotlin, Compose, Firebase"><span class="field-help">Separate tags with commas, up to 8.</span></label></div>
    <label>Excerpt<textarea name="excerpt" rows="3" maxlength="320" placeholder="A short summary for article cards">${esc(post.excerpt)}</textarea><span class="field-help">Up to 320 characters.</span></label>
    <div class="admin-cover-row"><label>Cover image<input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span class="field-help">Optional image, up to 5 MB. Firebase Storage must be initialized before uploads will work; use an HTTPS image URL for now.</span></label><label>Or cover image URL<input name="coverImage" type="url" maxlength="2048" value="${esc(post.coverImage)}" placeholder="https://…"></label></div>
    ${post.coverImage?`<div class="admin-cover-preview"><img src="${esc(post.coverImage)}" alt="Current article cover"><span class="field-help">Current cover image</span></div>`:''}
    <label>Article content<textarea name="content" rows="18" required maxlength="50000" placeholder="# Start with a heading…">${esc(post.content)}</textarea><span class="field-help">Markdown supported: headings, paragraphs, lists, links, inline code, and fenced code blocks.</span></label>
    <label class="admin-publish-toggle"><input name="isPublished" type="checkbox" ${post.isPublished?'checked':''}><span><strong>Published</strong><small>Published articles appear in the public writing pages. Drafts stay visible only here.</small></span></label>
    <div class="admin-form-actions"><button type="button" class="button button-plain" data-action="cancel">Cancel</button><button type="submit" class="button button-dark" ${state.busy?'disabled':''}>${state.busy?'Saving…':'Save article'} <span>↗</span></button></div>
    ${state.notice?`<div class="admin-notice" role="status">${esc(state.notice)}</div>`:''}
  </form></section>`;
}

function renderPanel() {
  const displayName = state.user?.displayName || state.user?.email || 'Admin';
  root.innerHTML = `<main class="admin-page"><header class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><div class="admin-account"><span>${esc(displayName)}</span><button class="admin-quiet" data-action="sign-out">Sign out ↗</button></div></header><div class="admin-shell"><aside class="admin-sidebar"><span class="mono">CONTENT MANAGEMENT</span><a class="admin-side-link active" href="#blog">Blog posts <span>${state.blogs.length}</span></a><a class="admin-side-link" href="/">View portfolio ↗</a><div class="admin-sidebar-note"><span class="status-dot"></span><span>Signed in as admin</span></div></aside><div class="admin-content"><div class="admin-heading"><span class="mono">PORTFOLIO / ADMIN</span><h1>Content desk<span class="accent-dot">.</span></h1><p>Manage drafts and published writing for the portfolio.</p></div>${state.selected ? renderEditor() : renderList()}</div></div></main>`;
}

function render() {
  if (state.user === undefined) {
    root.innerHTML = '<main class="admin-page"><div class="admin-loading">Checking admin access…</div></main>';
  } else if (!state.user) renderLogin();
  else if (!isOwnerAccount(state.user)) renderDenied();
  else if (!isAdmin(state.user)) renderUnverified();
  else renderPanel();
}

async function loadBlogs() {
  state.loading = true;
  state.notice = '';
  render();
  try {
    const snapshot = await execute(db.pipeline().collection('blogs'));
    state.blogs = snapshot.results.map(row => ({ ...row.data(), id: row.id }));
  } catch (error) {
    state.notice = `Could not load blog posts: ${error.message || 'check Firebase access and deployment settings.'}`;
  } finally {
    state.loading = false;
    render();
  }
}

function estimateReadingTime(content) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200));
}

async function savePost(form) {
  const formData = new FormData(form);
  const title = String(formData.get('title') || '').trim();
  const slug = slugify(String(formData.get('slug') || title).trim());
  const category = String(formData.get('category') || '').trim();
  const excerpt = String(formData.get('excerpt') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const tags = String(formData.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a URL-safe slug with lowercase letters, numbers, and hyphens.');
  if (tags.length > 8 || tags.some(tag => tag.length > 32)) throw new Error('Use no more than 8 tags, each 32 characters or shorter.');
  const conflict = state.blogs.find(item => item.slug === slug && item.id !== state.selected?.id);
  if (conflict) throw new Error('That URL slug is already used by another article.');

  const id = state.selected?.id || doc(collection(db, 'blogs')).id;
  const existing = state.blogs.find(item => item.id === id);
  let coverImage = String(formData.get('coverImage') || '').trim();
  const file = formData.get('coverFile');
  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024) throw new Error('Cover images must be 5 MB or smaller.');
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image.');
    const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
    const objectRef = ref(storage, `blogs/${id}/cover.${extension}`);
    await uploadBytes(objectRef, file, { contentType: file.type });
    coverImage = await getDownloadURL(objectRef);
  }
  if (coverImage && !/^https:\/\//i.test(coverImage)) throw new Error('Cover image URLs must use HTTPS.');

  await setDoc(doc(db, 'blogs', id), {
    title, slug, category, excerpt, content, coverImage, tags,
    readingTime: estimateReadingTime(content),
    isPublished: formData.get('isPublished') === 'on',
    order: existing?.order ?? 9007199254740991 - Date.now(),
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  state.selected = null;
  state.notice = 'Article saved.';
  await loadBlogs();
}

async function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'resend-verification') {
    state.busy = true; state.authError = ''; render();
    try {
      await sendEmailVerification(auth.currentUser);
      state.authError = `Firebase sent a verification link to ${adminEmail}. Check your inbox and spam folder.`;
    } catch (error) {
      state.authError = error.code === 'auth/too-many-requests'
        ? 'Firebase is temporarily limiting verification emails. Wait a few minutes, then try again.'
        : 'Could not send the verification email. Try again in a moment.';
    } finally { state.busy = false; render(); }
  } else if (action === 'check-verification') {
    state.busy = true; state.authError = ''; render();
    try {
      await reload(auth.currentUser);
      state.user = auth.currentUser;
      if (!isAdmin(state.user)) state.authError = 'Firebase still shows this email as unverified. Open the verification link, then check again.';
      else await loadBlogs();
    } catch (error) {
      state.authError = 'Could not refresh the sign-in status. Sign out and sign in again after verifying your email.';
    } finally { state.busy = false; render(); }
  } else if (action === 'reset-password') {
    const email = root.querySelector('#admin-login [name="email"]')?.value.trim();
    if (!email) {
      state.authError = 'Enter the owner email address first.';
      render();
      return;
    }
    if (email.toLowerCase() !== adminEmail) {
      state.authError = `Password reset is only available for the owner account (${adminEmail}).`;
      render();
      return;
    }
    state.busy = true; state.authError = ''; render();
    try {
      await sendPasswordResetEmail(auth, email);
      state.authError = `If an account exists for ${email}, Firebase has sent a password reset email.`;
    } catch (error) {
      state.authError = error.code === 'auth/operation-not-allowed'
        ? 'Email/password sign-in is not enabled for this Firebase project.'
        : 'Could not send the password reset email. Check the email address and try again.';
    } finally { state.busy = false; render(); }
  } else if (action === 'sign-out') {
    await signOut(auth); state.selected = null; state.blogs = []; state.notice = '';
  } else if (action === 'new') {
    state.selected = { title:'', slug:'', category:'', excerpt:'', content:'', coverImage:'', tags:[], isPublished:false };
    state.notice = ''; render();
  } else if (action === 'edit') {
    state.selected = state.blogs.find(item => item.id === button.dataset.id) || null;
    state.notice = ''; render();
  } else if (action === 'cancel') {
    state.selected = null; state.notice = ''; render();
  } else if (action === 'delete') {
    const post = state.blogs.find(item => item.id === button.dataset.id);
    if (!post || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    state.busy = true; render();
    try {
      await deleteDoc(doc(db, 'blogs', post.id));
      state.notice = 'Article deleted.';
      await loadBlogs();
    } catch (error) {
      state.notice = `Could not delete article: ${error.message || 'please try again.'}`;
    } finally { state.busy = false; render(); }
  }
}

async function handleSubmit(event) {
  if (event.target.id === 'admin-login') {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.namedItem('email').value.trim();
    const password = form.elements.namedItem('password').value;
    state.busy = true; state.authError = ''; render();
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (user.email?.toLowerCase() !== adminEmail) {
        await signOut(auth);
        state.authError = `Use the owner account (${adminEmail}).`;
      } else if (!user.emailVerified) {
        await sendEmailVerification(user);
        await signOut(auth);
        state.authError = 'Verify your email using the link Firebase just sent, then sign in again.';
      }
    } catch (error) {
      state.authError = error.code === 'auth/operation-not-allowed'
        ? 'Email/password sign-in is not enabled for this Firebase project.'
        : error.code === 'auth/unauthorized-domain'
          ? 'This hostname is not in Firebase Auth’s authorized domains yet.'
          : error.code === 'auth/too-many-requests'
            ? 'Too many sign-in attempts. Wait a while, then try again.'
            : 'Sign-in failed. Check the owner email and password, then try again.';
    } finally { state.busy = false; render(); }
    return;
  }
  if (event.target.id !== 'blog-editor') return;
  event.preventDefault();
  const form = event.target;
  state.busy = true; state.notice = '';
  const submit = form.querySelector('[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = 'Saving…'; }
  try {
    await savePost(form);
  } catch (error) {
    state.notice = error.message || 'Could not save this article.';
  } finally {
    state.busy = false;
    render();
  }
}

export function mountAdmin(target) {
  root = target;
  if (!root.dataset.adminEvents) {
    root.dataset.adminEvents = 'true';
    root.addEventListener('click', event => { handleClick(event); });
    root.addEventListener('submit', event => { handleSubmit(event); });
    root.addEventListener('input', event => {
      const form = event.target.closest('#blog-editor');
      if (!form) return;
      if (event.target.name === 'slug') event.target.dataset.touched = 'true';
      if (event.target.name === 'title') {
        const slug = form.elements.namedItem('slug');
        if (slug && !slug.dataset.touched) slug.value = slugify(event.target.value);
      }
    });
    onAuthStateChanged(auth, user => {
      state.user = user;
      state.selected = null;
      if (isAdmin(user)) loadBlogs();
      else render();
    });
  }
  render();
}
