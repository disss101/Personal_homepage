const searchInput = document.querySelector("#noteSearch");
const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
const noteCards = Array.from(document.querySelectorAll(".note-card"));
const emptyState = document.querySelector("#emptyState");

let activeFilter = new URLSearchParams(window.location.search).get("tag") || "全部";

function normalize(value) {
  return value.trim().toLowerCase();
}

function updateActiveButton() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateUrl() {
  const url = new URL(window.location);
  if (activeFilter === "全部") {
    url.searchParams.delete("tag");
  } else {
    url.searchParams.set("tag", activeFilter);
  }
  window.history.replaceState({}, "", url);
}

function applyFilters() {
  const query = normalize(searchInput.value);
  let visibleCount = 0;

  noteCards.forEach((card) => {
    const text = normalize(card.textContent);
    const title = normalize(card.dataset.title || "");
    const tags = card.dataset.tags || "";
    const matchesTag = activeFilter === "全部" || tags.includes(activeFilter);
    const matchesSearch = !query || title.includes(query) || text.includes(query);
    const isVisible = matchesTag && matchesSearch;

    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
    }
  });

  emptyState.hidden = visibleCount !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateUrl();
    updateActiveButton();
    applyFilters();
  });
});

updateActiveButton();
applyFilters();
searchInput.addEventListener("input", applyFilters);
