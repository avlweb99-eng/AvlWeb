const projectGrid = document.querySelector("#project-grid");
const catalogHeading = document.querySelector("[data-catalog-heading]");
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

const catalogDefinitions = {
  projects: {
    heading: "Games",
    itemName: "project",
    loadingMessage: "Loading released projects...",
    loadErrorMessage: "Released projects could not be loaded from siteConfig.xml.",
    emptyMessage: "No released projects were found in siteConfig.xml.",
    emptyMobileMessage: "No released projects are marked for smaller screens.",
  },
  plugins: {
    heading: "Plug-Ins",
    itemName: "plug-in",
    loadingMessage: "Loading plug-ins...",
    loadErrorMessage: "Plug-ins could not be loaded from siteConfig.xml.",
    emptyMessage: "No plug-ins were found in siteConfig.xml.",
    emptyMobileMessage: "No plug-ins are marked for smaller screens.",
  },
};

const state = {
  catalogs: {
    projects: [],
    plugins: [],
  },
  loaded: false,
  activeCatalog: "plugins",
};

function init() {
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  syncCatalogWithHash();
  loadCatalogs();

  window.addEventListener("hashchange", handleHashChange);

  if (typeof mobileProjectMedia.addEventListener === "function") {
    mobileProjectMedia.addEventListener("change", renderCatalog);
  } else if (typeof mobileProjectMedia.addListener === "function") {
    mobileProjectMedia.addListener(renderCatalog);
  }
}

function handleHashChange() {
  syncCatalogWithHash();

  if (!state.loaded) {
    setGridMessage(getCatalogDefinition().loadingMessage);
    return;
  }

  renderCatalog();
}

function syncCatalogWithHash() {
  state.activeCatalog = /^#games$/i.test(window.location.hash) ? "projects" : "plugins";
}

async function loadCatalogs() {
  setGridMessage(getCatalogDefinition().loadingMessage);

  try {
    const response = await fetch("siteConfig.xml", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    state.catalogs = parseSiteConfig(xmlText);
    state.loaded = true;
    renderCatalog();
  } catch (error) {
    console.error("Unable to load site config:", error);
    setGridMessage(getCatalogDefinition().loadErrorMessage);
  }
}

function parseSiteConfig(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const siteNode = xml.documentElement;
  const projectsNode = getFirstNamedChild(siteNode, "projects");
  const plugInsNode =
    getFirstNamedChild(projectsNode, "plugins") ||
    getFirstNamedChild(projectsNode, "plugIns") ||
    getFirstNamedChild(siteNode, "plugins") ||
    getFirstNamedChild(siteNode, "plugIns");

  return {
    projects: parseCatalogItems(getNamedChildren(projectsNode, "project"), "project"),
    plugins: parseCatalogItems(Array.from(plugInsNode?.children || []), "plug-in"),
  };
}

function parseCatalogItems(nodes, itemName) {
  return nodes
    .map((node, index) => ({
      id: (node.getAttribute("id") || `${itemName}-${index + 1}`).trim(),
      title: getNodeText(node, "labelTxt") || `${capitalizeLabel(itemName)} ${index + 1}`,
      description: getNodeText(node, "Description") || `Open this ${itemName}.`,
      href: normalizeSitePath(getNodeText(node, "url") || "#"),
      thumbnail: normalizeSitePath(getNodeText(node, "thumbnailImage") || ""),
      okForMobile: /^yes$/i.test(getNodeText(node, "okforMobile") || ""),
    }))
    .filter((item) => item.href && item.href !== "#");
}

function getCatalogDefinition() {
  return catalogDefinitions[state.activeCatalog] || catalogDefinitions.projects;
}

function getNodeText(node, tagName) {
  const child = getFirstNamedChild(node, tagName);
  return child ? child.textContent.trim() : "";
}

function getFirstNamedChild(node, tagName) {
  return getNamedChildren(node, tagName)[0] || null;
}

function getNamedChildren(node, tagName) {
  return Array.from(node?.children || []).filter(
    (child) => child.tagName && child.tagName.toLowerCase() === tagName.toLowerCase()
  );
}

function normalizeSitePath(value) {
  return value.replace(/\\/g, "/");
}

function getVisibleCatalogItems() {
  const activeItems = state.catalogs[state.activeCatalog] || [];

  if (!mobileProjectMedia.matches) {
    return activeItems;
  }

  return activeItems.filter((item) => item.okForMobile);
}

function renderCatalog() {
  if (!state.loaded) {
    return;
  }

  const catalogDefinition = getCatalogDefinition();
  const visibleItems = getVisibleCatalogItems();

  if (catalogHeading) {
    catalogHeading.textContent = catalogDefinition.heading;
  }

  if (!visibleItems.length) {
    const message = mobileProjectMedia.matches
      ? catalogDefinition.emptyMobileMessage
      : catalogDefinition.emptyMessage;
    setGridMessage(message);
    return;
  }

  projectGrid.innerHTML = visibleItems
    .map(
      (item, index) => `
        <a
          class="project-card"
          href="${escapeAttribute(item.href)}"
          style="animation-delay: ${index * 70}ms"
          aria-label="Open ${escapeAttribute(item.title)}"
        >
          <div class="project-card__image-wrap" aria-hidden="true">
            <img
              class="project-card__image"
              src="${escapeAttribute(item.thumbnail || placeholderImage())}"
              alt=""
              loading="lazy"
              onerror="this.onerror=null;this.src='${placeholderImage()}'"
            />
          </div>
          <div class="project-card__body">
            <h2 class="project-card__title">${escapeHtml(item.title)}</h2>
            <p class="project-card__description">${escapeHtml(item.description)}</p>
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

function capitalizeLabel(value) {
  return String(value)
    .replace(/(^|-)([a-z])/g, (_, separator, character) => `${separator}${character.toUpperCase()}`);
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
