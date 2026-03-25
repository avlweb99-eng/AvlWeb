const projectGrid = document.querySelector("#project-grid");
const footerYear = document.querySelector("[data-current-year]");
const mobileProjectMedia = window.matchMedia("(max-width: 760px)");

const placeholderSVG = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dfd4c1" />
        <stop offset="100%" stop-color="#a89d8a" />
      </linearGradient>
    </defs>
    <rect width="720" height="720" fill="url(#bg)" />
    <rect x="58" y="58" width="604" height="604" rx="22" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="8" />
    <path d="M168 478 L298 338 L406 432 L548 258" fill="none" stroke="rgba(0,0,0,0.24)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="238" cy="238" r="54" fill="rgba(255,255,255,0.45)" />
    <text x="360" y="602" text-anchor="middle" fill="#333333" font-family="Trebuchet MS, sans-serif" font-size="38">Image coming soon</text>
  </svg>
`);

const state = {
  projects: [],
  loaded: false,
};

function init() {
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  loadProjects();

  if (typeof mobileProjectMedia.addEventListener === "function") {
    mobileProjectMedia.addEventListener("change", renderProjects);
  } else if (typeof mobileProjectMedia.addListener === "function") {
    mobileProjectMedia.addListener(renderProjects);
  }
}

async function loadProjects() {
  setGridMessage("Loading released projects...");

  try {
    const response = await fetch("siteConfig.xml", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    state.projects = parseProjectConfig(xmlText);
    state.loaded = true;
    renderProjects();
  } catch (error) {
    console.error("Unable to load project config:", error);
    setGridMessage("Released projects could not be loaded from siteConfig.xml.");
  }
}

function parseProjectConfig(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const nodes = Array.from(xml.querySelectorAll("projects > project"));

  return nodes
    .map((node, index) => ({
      id: (node.getAttribute("id") || `project-${index + 1}`).trim(),
      title: getNodeText(node, "labelTxt") || `Project ${index + 1}`,
      description: getNodeText(node, "Description") || "Open this project.",
      href: normalizeSitePath(getNodeText(node, "url") || "#"),
      thumbnail: normalizeSitePath(getNodeText(node, "thumbnailImage") || ""),
      okForMobile: /^yes$/i.test(getNodeText(node, "okforMobile") || ""),
    }))
    .filter((project) => project.href && project.href !== "#");
}

function getNodeText(node, tagName) {
  const child = Array.from(node.children).find(
    (entry) => entry.tagName && entry.tagName.toLowerCase() === tagName.toLowerCase()
  );

  return child ? child.textContent.trim() : "";
}

function normalizeSitePath(value) {
  return value.replace(/\\/g, "/");
}

function getVisibleProjects() {
  if (!mobileProjectMedia.matches) {
    return state.projects;
  }

  return state.projects.filter((project) => project.okForMobile);
}

function renderProjects() {
  if (!state.loaded) {
    return;
  }

  const visibleProjects = getVisibleProjects();

  if (!visibleProjects.length) {
    const message = mobileProjectMedia.matches
      ? "No released projects are marked for smaller screens."
      : "No released projects were found in siteConfig.xml.";
    setGridMessage(message);
    return;
  }

  projectGrid.innerHTML = visibleProjects
    .map(
      (project, index) => `
        <a
          class="project-card"
          href="${escapeAttribute(project.href)}"
          style="animation-delay: ${index * 70}ms"
          aria-label="Open ${escapeAttribute(project.title)}"
        >
          <div class="project-card__image-wrap" aria-hidden="true">
            <img
              class="project-card__image"
              src="${escapeAttribute(project.thumbnail || placeholderImage())}"
              alt=""
              loading="lazy"
              onerror="this.onerror=null;this.src='${placeholderImage()}'"
            />
          </div>
          <div class="project-card__body">
            <h2 class="project-card__title">${escapeHtml(project.title)}</h2>
            <p class="project-card__description">${escapeHtml(project.description)}</p>
          </div>
        </a>
      `
    )
    .join("");
}

function setGridMessage(message) {
  projectGrid.innerHTML = `<p class="catalog__message">${escapeHtml(message)}</p>`;
}

function placeholderImage() {
  return `data:image/svg+xml;charset=UTF-8,${placeholderSVG}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
