const footerYear = document.querySelector("[data-current-year]");
const parkwayActionButton = document.querySelector("#parkway-action");
const parkwaySummary = document.querySelector("[data-parkway-summary]");
const parkwayStatusChip = document.querySelector("[data-parkway-status-chip]");
const eventsStatus = document.querySelector("#events-status");
const eventsGrid = document.querySelector("#events-grid");
const venueTabs = Array.from(document.querySelectorAll("[data-venue-tab]"));

const state = {
  parkwayActionUrl: "",
  activeVenueId: "avl-picks",
  venueRequestId: 0,
};

function init() {
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  parkwayActionButton.addEventListener("click", () => {
    if (!state.parkwayActionUrl) {
      return;
    }

    window.location.href = state.parkwayActionUrl;
  });

  venueTabs.forEach((tabButton) => {
    tabButton.addEventListener("click", () => {
      const venueId = tabButton.dataset.venueTab;
      if (!venueId || venueId === state.activeVenueId) {
        return;
      }

      loadVenueEvents(venueId);
    });
  });

  loadParkwayStatus();
  loadVenueEvents(state.activeVenueId);
}

async function loadParkwayStatus() {
  setParkwayState("Loading", "Checking the latest road status for the Asheville corridor.", false);

  try {
    const response = await fetch("/api/blue-ridge-parkway-status", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    state.parkwayActionUrl = payload.actionUrl || "";

    if (payload.status === "Closed") {
      setParkwayState(
        "Closed",
        "One or more Asheville parkway sections are currently closed. Open the official update for the latest closure details.",
        Boolean(state.parkwayActionUrl),
      );
      return;
    }

    setParkwayState(
      "Open",
      "The monitored Asheville parkway sections are currently open. Use the official page for detailed updates and changes.",
      Boolean(state.parkwayActionUrl),
    );
  } catch (error) {
    state.parkwayActionUrl = "";
    setParkwayState(
      "Unavailable",
      "The live parkway check is unavailable right now. Try again in a moment.",
      false,
    );
  }
}

function setParkwayState(status, summary, actionEnabled) {
  parkwayStatusChip.textContent = status;
  parkwayStatusChip.dataset.status = status.toLowerCase();
  parkwaySummary.textContent = summary;
  parkwayActionButton.disabled = !actionEnabled;
}

async function loadVenueEvents(venueId) {
  const requestId = ++state.venueRequestId;
  state.activeVenueId = venueId;
  syncActiveVenueTab();
  setEventsStatus("Loading upcoming events...", false);
  eventsGrid.innerHTML = "";

  try {
    const response = await fetch(`/api/venue-events?venue=${encodeURIComponent(venueId)}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (requestId !== state.venueRequestId) {
      return;
    }

    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    renderVenueCards(payload);

    if (payload.events && payload.events.length) {
      setEventsStatus(`${payload.label} - ${payload.events.length} upcoming events`, false);
      return;
    }

    setEventsStatus(`No upcoming events found for ${payload.label}.`, false);
  } catch (error) {
    if (requestId !== state.venueRequestId) {
      return;
    }

    eventsGrid.innerHTML = "";
    setEventsStatus("Venue events are unavailable right now.", true);
  }
}

function syncActiveVenueTab() {
  venueTabs.forEach((tabButton) => {
    const isActive = tabButton.dataset.venueTab === state.activeVenueId;
    tabButton.classList.toggle("is-active", isActive);
    tabButton.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function setEventsStatus(message, isError) {
  eventsStatus.textContent = message;
  eventsStatus.classList.toggle("is-error", isError);
}

function renderVenueCards(payload) {
  const events = payload.events || [];
  if (!events.length) {
    return;
  }

  eventsGrid.innerHTML = events
    .map((eventItem) => {
      const badgeText = extractEventBadge(eventItem.dateText);
      const metaParts = [];

      if (payload.venue === "avl-picks" && eventItem.venueLabel) {
        metaParts.push(eventItem.venueLabel);
      }

      if (eventItem.metaText) {
        metaParts.push(eventItem.metaText);
      }

      const metaMarkup = metaParts.length
        ? `<span class="event-card__meta">${escapeHtml(metaParts.join(" - "))}</span>`
        : "";
      const posterMarkup = eventItem.posterUrl
        ? `<img src="${escapeAttribute(eventItem.posterUrl)}" alt="" loading="lazy" />`
        : `<span class="event-card__fallback">${escapeHtml(fallbackPosterLabel(eventItem, payload))}</span>`;

      return `
        <a class="event-card" href="${escapeAttribute(eventItem.url)}">
          <span class="event-card__poster">
            ${posterMarkup}
            <span class="event-card__badge">${escapeHtml(badgeText)}</span>
          </span>
          <span class="event-card__body">
            <span class="event-card__title">${escapeHtml(eventItem.title)}</span>
            <span class="event-card__date">${escapeHtml(eventItem.dateText || "Upcoming event")}</span>
            ${metaMarkup}
          </span>
        </a>
      `;
    })
    .join("");
}

function extractEventBadge(dateText) {
  const normalized = String(dateText || "").trim();
  const monthDayMatch = normalized.match(/\b([A-Z][a-z]{2,8}\s+\d{1,2})\b/);
  if (monthDayMatch) {
    return monthDayMatch[1];
  }

  const numericMatch = normalized.match(/\b(\d{1,2}\/\d{1,2})\b/);
  return numericMatch ? numericMatch[1] : "Soon";
}

function fallbackPosterLabel(eventItem, payload) {
  const label = payload.venue === "avl-picks"
    ? eventItem.venueLabel || "AVL"
    : payload.label;

  return String(label)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "AVL";
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
