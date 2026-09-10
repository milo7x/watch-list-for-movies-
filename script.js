const $ = (selector) => document.querySelector(selector);
const storageKey = "aftercredits.movies.v1";
const dialog = $("#movie-dialog");
const form = $("#movie-form");
const collections = { international: internationalMovies, polish: polishMovies };
const catalog = [...new Map([...internationalMovies, ...polishMovies].map((movie) => [movie.imdbId || movie.catalogId, movie])).values()];
let activeCollection = "international";
let rankingPage = 1;
const pageSize = 20;
let selectedSuggestedMovie = null;
let suggestionMatches = [];
let activeSuggestion = -1;
let movies = [];
let activeFilter = "all";
let deletedMovie = null;
let toastTimer;

function safePoster(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function notify(message, undo = false) {
  clearTimeout(toastTimer);
  $("#toast-message").textContent = message;
  $("#undo-button").hidden = !undo;
  $("#toast").hidden = false;

  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, undo ? 10000 : 4000);
}

function loadMovies() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");

    if (
      !Array.isArray(saved) ||
      saved.some((movie) => !movie || typeof movie.title !== "string")
    ) {
      throw new Error("Invalid saved collection");
    }

    movies = saved.map((movie, index) => ({
      id: String(index),
      title: movie.title.slice(0, 120),
      year: String(movie.year || "").slice(0, 4),
      genre: String(movie.genre || "").slice(0, 50),
      poster: safePoster(movie.poster),
      watched: movie.watched === true,
      imdbId: /^tt\d+$/.test(movie.imdbId || "") ? movie.imdbId : "",
      externalRating: Number(movie.externalRating) > 0 && Number(movie.externalRating) <= 10 ? Number(movie.externalRating) : null,
      ratingSource: typeof movie.ratingSource === "string" ? movie.ratingSource.slice(0, 80) : "",
      rating:
        movie.watched === true &&
        Number.isInteger(movie.rating) &&
        movie.rating >= 0 &&
        movie.rating <= 5
          ? movie.rating
          : 0
    }));
  } catch {
    $("#storage-status").textContent =
      "Saved movies couldn't be loaded. Browser storage may be unavailable.";
  }
}

function saveMovies() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(movies));
    $("#storage-status").textContent =
      "Saved in this browser · No account needed";
  } catch {
    $("#storage-status").textContent =
      "Changes aren't saved. Keep this tab open; browser storage is unavailable or full.";
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

function makeButton(text, className, action) {
  const button = element("button", className, text);
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}

function updateMovies() {
  saveMovies();
  renderMovies();
  renderRankings();
}

function createCard(movie) {
  const card = element("article", "movie-card");
  const poster = element("div", "poster");
  const fallback = element("span", "poster-title", movie.title);

  fallback.setAttribute("aria-hidden", "true");
  poster.append(fallback);

  if (movie.poster) {
    const image = element("img");
    image.alt = `${movie.title} poster`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove());
    image.src = movie.poster;
    poster.append(image);
  }

  poster.append(
    element(
      "span",
      `badge${movie.watched ? " watched" : ""}`,
      movie.watched ? "✓ Watched" : "Want to watch"
    )
  );

  const body = element("div", "card-body");

  body.append(element("h2", "", movie.title));

  body.append(
    element(
      "p",
      "metadata",
      [movie.year, movie.genre].filter(Boolean).join(" · ") ||
        "Year and genre not added"
    )
  );

  if (movie.externalRating) body.append(element("p", "catalog-rating", `★ ${movie.externalRating} / 10 · ${movie.ratingSource}`));

  const rating = element("div", "rating");
  rating.setAttribute("role", "group");
  rating.setAttribute("aria-label", `Rate ${movie.title}`);

  for (let value = 1; value <= 5; value++) {
    const star = makeButton(
      "★",
      `star${value <= movie.rating ? " filled" : ""}`,
      () => {
        movie.rating = movie.rating === value ? 0 : value;
        updateMovies();

        document.getElementById(`star-${movie.id}-${value}`)?.focus();

        notify(
          movie.rating
            ? `Rated ${movie.rating} out of 5`
            : "Rating cleared"
        );
      }
    );

    star.id = `star-${movie.id}-${value}`;
    star.disabled = !movie.watched;

    star.setAttribute(
      "aria-label",
      `${value} out of 5 stars. Select again to clear.`
    );

    star.setAttribute("aria-pressed", String(movie.rating === value));
    rating.append(star);
  }

  body.append(
    rating,
    element(
      "span",
      "rating-label",
      movie.watched
        ? movie.rating
          ? `${movie.rating} / 5 · Your rating`
          : "Not rated · Pick a star"
        : "Mark watched to rate"
    )
  );

  const actions = element("div", "card-actions");

  const watch = makeButton(
    movie.watched ? "↶ Watch again" : "✓ Mark watched",
    "watch-button",
    () => {
      movie.watched = !movie.watched;

      if (!movie.watched) movie.rating = 0;

      updateMovies();

      const nextFocus =
        document.getElementById(`watch-${movie.id}`) ||
        $(".filters [aria-pressed='true']");

      nextFocus.focus();

      notify(
        movie.watched
          ? "Marked as watched. Pick a star to rate it."
          : "Moved to Want to watch. Rating cleared."
      );
    }
  );

  watch.id = `watch-${movie.id}`;

  watch.setAttribute(
    "aria-label",
    movie.watched
      ? `Move ${movie.title} to Want to watch and clear rating`
      : `Mark ${movie.title} as watched`
  );

  const remove = makeButton("×", "delete-button", () => {
    deletedMovie = {
      movie,
      index: movies.indexOf(movie)
    };

    movies = movies.filter((item) => item.id !== movie.id);
    updateMovies();
    notify("Movie removed", true);
    $("#undo-button").focus();
  });

  remove.setAttribute("aria-label", `Delete ${movie.title}`);

  actions.append(watch, remove);
  body.append(actions);
  card.append(poster, body);

  return card;
}

function renderMovies() {
  const watched = movies.filter((movie) => movie.watched);
  const rated = watched.filter((movie) => movie.rating > 0);

  $("#total-count").textContent = movies.length;
  $("#pending-count").textContent = movies.length - watched.length;
  $("#watched-count").textContent = watched.length;

  $("#average-rating").textContent = rated.length
    ? (
        rated.reduce((sum, movie) => sum + movie.rating, 0) /
        rated.length
      ).toFixed(1)
    : "—";

  const search = $("#search").value.trim().toLowerCase();

  const visible = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(search) &&
      (
        activeFilter === "all" ||
        (activeFilter === "watched" ? movie.watched : !movie.watched)
      )
  );

  $("#movie-list").replaceChildren(...visible.map(createCard));

  $("#result-count").textContent =
    `${visible.length} movie${visible.length === 1 ? "" : "s"}` +
    (
      search || activeFilter !== "all"
        ? ` of ${movies.length}`
        : " in your collection"
    );

  $("#empty-state").hidden = visible.length > 0;

  $("#empty-title").textContent = movies.length
    ? "No movies here yet."
    : "Your next favorite is waiting.";

  $("#empty-description").textContent = movies.length
    ? "Try another search or filter, or add a movie."
    : "Add a movie to start your collection.";

  $("#empty-add").textContent = movies.length
    ? "＋ Add movie"
    : "＋ Add your first movie";
}

function openForm() {
  form.reset();
  selectedSuggestedMovie = null;
  $("#selected-movie").hidden = true;
  $("#suggestion-help").textContent = "Type at least 2 letters to search both collections, or add your own film.";
  closeSuggestions();
  $("#title").setCustomValidity("");
  $("#poster").setCustomValidity("");
  dialog.showModal();
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[łŁ]/g, "l").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sameMovie(saved, candidate) {
  if (saved.imdbId && candidate.imdbId) return saved.imdbId === candidate.imdbId;
  const titles = [candidate.title, ...(candidate.aliases || [])].map(normalize);
  const known = catalog.find((item) => (item.imdbId && item.imdbId === candidate.imdbId) || ([item.title, ...(item.aliases || [])].some((title) => normalize(title) === normalize(candidate.title)) && (!candidate.year || [item.year, ...(item.yearAliases || [])].map(String).includes(String(candidate.year)))));
  if (known) titles.push(...[known.title, ...(known.aliases || [])].map(normalize));
  const years = [candidate.year, ...(candidate.yearAliases || []), ...(known ? [known.year, ...(known.yearAliases || [])] : [])].map(String);
  return titles.includes(normalize(saved.title)) && (!saved.year || !candidate.year || years.includes(String(saved.year)));
}

function isAdded(movie) {
  return movies.some((saved) => sameMovie(saved, movie));
}

function addCatalogMovie(movie) {
  if (isAdded(movie)) return false;
  movies.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: movie.title,
    year: String(movie.year),
    genre: movie.genre || "",
    poster: safePoster(movie.poster),
    imdbId: movie.imdbId || "",
    externalRating: movie.rating || null,
    ratingSource: movie.ratingSource || "",
    watched: false,
    rating: 0
  });
  updateMovies();
  notify(`${movie.title} added to your watchlist`);
  return true;
}

function renderRankings() {
  const list = collections[activeCollection];
  const info = catalogInfo[activeCollection];
  const query = normalize($("#ranking-search").value);
  const matches = list.filter((movie) => [movie.title, ...(movie.aliases || [])].some((title) => normalize(title).includes(query)));
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  rankingPage = Math.min(Math.max(1, rankingPage), pageCount);
  $("#collection-title").textContent = info.title;
  $("#collection-description").textContent = info.description;
  const sourceLink = element("a", "", info.sourceLabel);
  sourceLink.href = info.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  $("#ranking-source").replaceChildren(document.createTextNode(`${info.snapshot} · `), sourceLink, document.createTextNode(` · ${info.note}`));
  $("#ranking-count").textContent = query ? `${matches.length} of ${list.length} films` : `${list.length} films in this collection`;
  $("#collection-progress").textContent = `${list.filter(isAdded).length} / ${list.length} in your watchlist`;
  $("#ranking-empty").hidden = matches.length > 0;
  $("#page-info").textContent = `${rankingPage} / ${pageCount}`;
  $("#previous-page").disabled = rankingPage === 1;
  $("#next-page").disabled = rankingPage === pageCount;
  const cards = matches.slice((rankingPage - 1) * pageSize, rankingPage * pageSize).map((movie) => {
    const card = element("article", "movie-card ranking-card");
    const poster = element("div", "poster");
    const fallback = element("span", "poster-title", movie.title);
    fallback.setAttribute("aria-hidden", "true");
    poster.append(fallback);
    if (safePoster(movie.poster)) {
      const image = element("img");
      image.alt = `${movie.title} poster`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove());
      image.src = movie.poster;
      poster.append(image);
    }
    poster.append(element("span", `rank-number${movie.rank <= 3 ? " podium" : ""}`, `#${movie.rank}`));
    const body = element("div", "card-body");
    body.append(element("h3", "catalog-title", movie.title));
    body.append(element("p", "metadata", [movie.year, movie.genre].filter(Boolean).join(" · ")));
    if (movie.rating) body.append(element("p", "catalog-rating", `★ ${movie.rating} / 10 · ${movie.ratingSource}`));
    const link = element("a", "imdb-link", movie.imdbId ? "View on IMDb ↗" : "View film source ↗");
    link.href = movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : movie.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${link.textContent}: ${movie.title}`);
    body.append(link);
    const added = isAdded(movie);
    const add = makeButton(added ? "✓ In your watchlist" : "＋ Add to watchlist", "catalog-add", () => {
      if (!addCatalogMovie(movie)) return;
      const replacement = document.getElementById(`add-${activeCollection}-${movie.rank}`);
      replacement?.focus();
    });
    add.id = `add-${activeCollection}-${movie.rank}`;
    add.setAttribute("aria-disabled", String(added));
    add.setAttribute("aria-label", `${added ? "Already in watchlist" : "Add to watchlist"}: ${movie.title}`);
    body.append(add);
    card.append(poster, body);
    return card;
  });
  $("#ranking-list").replaceChildren(...cards);
}

function closeSuggestions() {
  $("#suggestions").hidden = true;
  $("#suggestions").replaceChildren();
  $("#title").setAttribute("aria-expanded", "false");
  $("#title").removeAttribute("aria-activedescendant");
  activeSuggestion = -1;
}

function chooseSuggestion(movie) {
  selectedSuggestedMovie = movie;
  $("#title").value = movie.title;
  $("#title").setCustomValidity("");
  $("#year").value = movie.year;
  $("#genre").value = movie.genre || "";
  $("#poster").value = movie.poster || "";
  $("#poster").setCustomValidity("");
  $("#selected-movie").textContent = isAdded(movie) ? "This film is already in your watchlist." : `✓ Details filled in${movie.rating ? ` · ${movie.rating} / 10 ${movie.ratingSource}` : ""}`;
  $("#selected-movie").hidden = false;
  closeSuggestions();
  $("#title").focus();
}

function showSuggestions() {
  closeSuggestions();
  const query = normalize($("#title").value);
  if (query.length < 2) {
    $("#suggestion-help").textContent = "Type at least 2 letters to search both collections, or add your own film.";
    return;
  }
  suggestionMatches = catalog.filter((movie) => [movie.title, ...(movie.aliases || [])].some((title) => normalize(title).includes(query))).slice(0, 5);
  $("#suggestion-help").textContent = suggestionMatches.length ? "Choose a film, or use ↑ ↓ and Enter. You can also add your own." : "No match in these collections. You can still add this film manually.";
  if (!suggestionMatches.length) return;
  $("#suggestions").hidden = false;
  $("#title").setAttribute("aria-expanded", "true");
  suggestionMatches.forEach((movie, index) => {
    const option = element("div", "suggestion");
    option.id = `suggestion-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    const thumbnail = element("span", "suggestion-thumb");
    if (safePoster(movie.poster)) {
      const image = element("img");
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove());
      image.src = movie.poster;
      thumbnail.append(image);
    }
    const text = element("div");
    text.append(element("strong", "", movie.title), element("small", "", `${movie.year}${movie.rating ? ` · ★ ${movie.rating} ${movie.ratingSource}` : ""}${isAdded(movie) ? " · Already added" : ""}`));
    option.append(thumbnail, text);
    option.addEventListener("pointerdown", (event) => event.preventDefault());
    option.addEventListener("click", () => chooseSuggestion(movie));
    $("#suggestions").append(option);
  });
}

function showView() {
  const rankings = location.hash === "#rankings";
  $("#watchlist-view").hidden = rankings;
  $("#rankings-view").hidden = !rankings;
  document.querySelectorAll("[data-view]").forEach((link) => {
    if (link.dataset.view === (rankings ? "rankings" : "watchlist")) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

window.addEventListener("hashchange", () => {
  showView();
  window.scrollTo({ top: 0, behavior: "instant" });
});

document.querySelectorAll("[data-collection]").forEach((button) => {
  button.addEventListener("click", () => {
    activeCollection = button.dataset.collection;
    rankingPage = 1;
    $("#ranking-search").value = "";
    document.querySelectorAll("[data-collection]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    renderRankings();
  });
});

$("#ranking-search").addEventListener("input", () => { rankingPage = 1; renderRankings(); });
$("#previous-page").addEventListener("click", () => { rankingPage--; renderRankings(); $("#collection-title").scrollIntoView({ block: "start" }); });
$("#next-page").addEventListener("click", () => { rankingPage++; renderRankings(); $("#collection-title").scrollIntoView({ block: "start" }); });
$("#year").addEventListener("input", () => {
  if (selectedSuggestedMovie && $("#year").value !== String(selectedSuggestedMovie.year)) {
    selectedSuggestedMovie = null;
    $("#selected-movie").hidden = true;
  }
});
$("#title").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#suggestions").hidden) {
    event.preventDefault();
    event.stopPropagation();
    closeSuggestions();
  } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
    if ($("#suggestions").hidden) showSuggestions();
    if (!suggestionMatches.length || $("#suggestions").hidden) return;
    event.preventDefault();
    activeSuggestion = activeSuggestion === -1 ? (event.key === "ArrowDown" ? 0 : suggestionMatches.length - 1) : (activeSuggestion + (event.key === "ArrowDown" ? 1 : -1) + suggestionMatches.length) % suggestionMatches.length;
    document.querySelectorAll("#suggestions [role='option']").forEach((option, index) => option.setAttribute("aria-selected", String(index === activeSuggestion)));
    $("#title").setAttribute("aria-activedescendant", `suggestion-${activeSuggestion}`);
    document.getElementById(`suggestion-${activeSuggestion}`).scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter" && !$("#suggestions").hidden && activeSuggestion >= 0) {
    event.preventDefault();
    chooseSuggestion(suggestionMatches[activeSuggestion]);
  } else if (event.key === "Tab") closeSuggestions();
});
form.addEventListener("click", (event) => { if (!event.target.closest(".suggestion-field")) closeSuggestions(); });
dialog.addEventListener("close", closeSuggestions);

$("#add-button").addEventListener("click", openForm);
$("#nav-add").addEventListener("click", () => {
  location.hash = "watchlist";
  showView();
  openForm();
});
$("#empty-add").addEventListener("click", openForm);

$("#close-dialog").addEventListener("click", () => dialog.close());
$("#cancel-dialog").addEventListener("click", () => dialog.close());
$("#title").addEventListener("input", () => {
  $("#title").setCustomValidity("");
  if (selectedSuggestedMovie) {
    if ($("#year").value === String(selectedSuggestedMovie.year)) $("#year").value = "";
    if ($("#genre").value === selectedSuggestedMovie.genre) $("#genre").value = "";
    if ($("#poster").value === selectedSuggestedMovie.poster) $("#poster").value = "";
    selectedSuggestedMovie = null;
    $("#selected-movie").hidden = true;
  }
  showSuggestions();
});

$("#title").addEventListener("input", () => {
  $("#title").setCustomValidity("");
});

$("#poster").addEventListener("input", () => {
  $("#poster").setCustomValidity("");
});

$("#search").addEventListener("input", renderMovies);

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });

    renderMovies();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("#title").value.trim();
  const poster = $("#poster").value.trim();

  $("#title").setCustomValidity(title ? "" : "Enter a movie title.");

  $("#poster").setCustomValidity(
    poster && !safePoster(poster)
      ? "Use an http or https image URL."
      : ""
  );

  if (!form.reportValidity()) return;
  const selected = selectedSuggestedMovie && normalize(title) === normalize(selectedSuggestedMovie.title) && $("#year").value === String(selectedSuggestedMovie.year) ? selectedSuggestedMovie : null;
  const candidate = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    year: $("#year").value,
    genre: $("#genre").value.trim(),
    poster: safePoster(poster),
    watched: $("#already-watched").checked,
    rating: 0,
    imdbId: selected?.imdbId || "",
    externalRating: selected?.rating || null,
    ratingSource: selected?.ratingSource || ""
  };
  if (movies.some((movie) => sameMovie(movie, selected || candidate))) {
    $("#title").setCustomValidity("This movie is already in your watchlist.");
    form.reportValidity();
    return;
  }
  movies.unshift(candidate);
  activeFilter = "all";
  $("#search").value = "";

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === "all")
    );
  });

  updateMovies();
  dialog.close();
  location.hash = "watchlist";
  showView();
  notify("Movie added to your collection");
});

$("#undo-button").addEventListener("click", () => {
  if (!deletedMovie) return;

  movies.splice(deletedMovie.index, 0, deletedMovie.movie);
  deletedMovie = null;

  updateMovies();
  notify("Movie restored");
  $("#add-button").focus();
});

loadMovies();
renderMovies();
renderRankings();
showView();

if (document.modelContext?.registerTool) {
  try {
    const lifecycle = new AbortController();

    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "list_watchlist_movies",
          description:
            "Read the movies, watched statuses, and personal ratings in this browser's watchlist.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          },
          annotations: {
            readOnlyHint: true,
            untrustedContentHint: true
          },
          execute: () => movies.map((movie) => ({ ...movie }))
        },
        { signal: lifecycle.signal }
      )
    ).catch(() => {});

    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) lifecycle.abort();
      },
      { once: true }
    );
  } catch {}
}
