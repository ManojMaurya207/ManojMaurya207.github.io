import { published } from "./utils.js";

const query = (selector, root = document) => root.querySelector(selector);

export function bindPageInteractions({ data, render }) {
  bindInternalNavigation(render);
  bindThemeToggle();
  bindMobileMenu();
  bindProjectFilters(data);
  bindBlogRetry();
  bindContactForm(data);
  revealOnScroll();
}

function bindInternalNavigation(render) {
  document.querySelectorAll('a[href^="/"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      const pathname = new URL(href, location.href).pathname;
      const opensAnotherContext =
        anchor.target && anchor.target.toLowerCase() !== "_self";
      const isDownload = anchor.hasAttribute("download");
      const isStaticResource =
        pathname.startsWith("/assets/") ||
        /\.(pdf|png|jpe?g|gif|svg|webp|zip|docx?|xlsx?|pptx?)$/i.test(pathname);

      // Let the browser open files such as the résumé instead of routing them as app pages.
      if (opensAnotherContext || isDownload || isStaticResource) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      history.pushState({}, "", href);
      window.scrollTo(0, 0);
      render();
    });
  });
}

function bindThemeToggle() {
  query(".theme-toggle")?.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("portfolio-theme", dark ? "dark" : "light");
  });
}

function bindMobileMenu() {
  query(".menu-toggle")?.addEventListener("click", (event) => {
    const menu = event.currentTarget;
    const opened = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", String(!opened));
    query(".mobile-nav")?.classList.toggle("open", !opened);
  });
}

function bindProjectFilters(data) {
  const search = query("#project-search");
  let selectedCategory = "All";
  const cards = [...document.querySelectorAll("#project-grid .project-card")];
  if (!search && !cards.length) return;

  const projects = published(data.projects);
  const applyFilters = () => {
    let visibleCount = 0;
    cards.forEach((card, index) => {
      const project = projects[index];
      const matchesCategory =
        selectedCategory === "All" ||
        (project.category || "")
          .toLowerCase()
          .includes(selectedCategory.toLowerCase());
      const matchesSearch = card.textContent
        .toLowerCase()
        .includes((search?.value || "").toLowerCase());
      card.hidden = !(matchesCategory && matchesSearch);
      if (!card.hidden) visibleCount++;
    });

    const emptyMessage = query(".empty-state");
    if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
  };

  search?.addEventListener("input", applyFilters);
  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      query(".filter.active")?.classList.remove("active");
      button.classList.add("active");
      selectedCategory = button.dataset.filter;
      applyFilters();
    });
  });
}

function bindBlogRetry() {
  query("#blog-retry")?.addEventListener("click", () => location.reload());
}

function bindContactForm(data) {
  const form = query("#contact-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const subject = encodeURIComponent(
      `Portfolio enquiry from ${formData.get("name")}`,
    );
    const body = encodeURIComponent(
      `${formData.get("message")}\n\nFrom: ${formData.get("name")} (${formData.get("email")})`,
    );

    if (data.profile.email) {
      location.href = `mailto:${data.profile.email}?subject=${subject}&body=${body}`;
      return;
    }

    const note = query(".form-note");
    note.textContent = "Email contact details have not been configured yet.";
    note.classList.add("error");
  });
}

function revealOnScroll() {
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }),
    { threshold: 0.08 },
  );
  elements.forEach((element) => observer.observe(element));
}

export function initCustomCursor() {
  const isSupported = matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  ).matches;
  if (!isSupported) return;

  const ring = document.createElement("span");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  const dot = document.createElement("span");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  document.body.classList.add("has-custom-cursor");

  let pointerX = 0;
  let pointerY = 0;
  let ringX = 0;
  let ringY = 0;
  let animationFrame = 0;

  const animateRing = () => {
    ringX += (pointerX - ringX) * 0.2;
    ringY += (pointerY - ringY) * 0.2;
    ring.style.transform = `translate3d(${ringX}px,${ringY}px,0) translate(-50%,-50%)`;
    if (Math.abs(pointerX - ringX) + Math.abs(pointerY - ringY) > 0.25) {
      animationFrame = requestAnimationFrame(animateRing);
    } else {
      animationFrame = 0;
    }
  };

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    ring.classList.add("is-visible");
    dot.classList.add("is-visible");
    dot.style.transform = `translate3d(${pointerX}px,${pointerY}px,0) translate(-50%,-50%)`;
    if (!animationFrame) animationFrame = requestAnimationFrame(animateRing);

    const target = event.target instanceof Element ? event.target : null;
    const editing = target?.closest(
      'input,textarea,select,[contenteditable="true"]',
    );
    const interactive = target?.closest(
      'a,button,[role="button"],.project-card,.filter',
    );
    document.body.classList.toggle("cursor-native", Boolean(editing));
    ring.classList.toggle("is-hidden", Boolean(editing));
    dot.classList.toggle("is-hidden", Boolean(editing));
    ring.classList.toggle("is-hovering", Boolean(interactive) && !editing);
  });

  document.addEventListener("pointerleave", () => {
    ring.classList.remove("is-visible", "is-hovering");
    dot.classList.remove("is-visible");
    document.body.classList.remove("cursor-native");
  });
  document.addEventListener("pointerdown", () =>
    ring.classList.add("is-pressed"),
  );
  document.addEventListener("pointerup", () =>
    ring.classList.remove("is-pressed"),
  );
}
