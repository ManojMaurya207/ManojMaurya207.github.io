import { pageIntro } from "../components.js";
import { escapeHtml as esc } from "../utils.js";

export function contactPage(data) {
  const socials = data.profile.socials.filter((social) => social.url);
  const socialLinks = socials
    .map((social) => {
      const external = social.url.startsWith("mailto:")
        ? ""
        : 'target="_blank" rel="noreferrer"';
      return `<a href="${esc(social.url)}" ${external}><span>${esc(social.label)}</span><span>${esc(social.handle || "Say hello")} ↗</span></a>`;
    })
    .join("");
  const phoneLink = data.profile.phone
    ? `<a href="tel:${esc(data.profile.phone.replace(/\s/g, ""))}"><span>Phone</span><span>${esc(data.profile.phone)} ↗</span></a>`
    : "";

  return `<main>${pageIntro("CONTACT / 06", "Let’s connect", "Have a project in mind, a role to discuss, or just want to talk mobile? My inbox is open.")}
    <section class="contact-layout wrap">
      <div class="contact-details"><span class="mono">ELSEWHERE ON THE INTERNET</span>${socialLinks}${phoneLink}</div>
      <form class="contact-form" id="contact-form">
        <label>Name<input name="name" autocomplete="name" required placeholder="Your name"></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
        <label>What’s on your mind?<textarea name="message" rows="5" required placeholder="A few details…"></textarea></label>
        <button class="button button-dark" type="submit">Prepare email <span>↗</span></button>
        <p class="form-note">This opens your email app with the message ready to send.</p>
      </form>
    </section>
  </main>`;
}

export function notFoundPage() {
  return `<main class="not-found wrap"><span class="mono">ERROR / 404</span><h1>Well, this is<br>unexpected<span class="accent-dot">.</span></h1><p>The page you’re looking for isn’t here.</p><a class="button button-dark" href="/">Back to home <span>↗</span></a></main>`;
}
