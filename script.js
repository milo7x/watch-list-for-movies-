const STORAGE_KEY = "aftercredits.movies.v1";
const BACKUP_VERSION = 3;
const PAGE_SIZE = 20;
const MAX_SUGGESTIONS = 5;
const MAX_BACKUP_MOVIES = 10000;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_NOTES_LENGTH = 2000;

const selectElement = (selector) => document.querySelector(selector);
const selectElements = (selector) => [...document.querySelectorAll(selector)];
const movieDialog = selectElement("#movie-dialog");
const movieForm = selectElement("#movie-form");
const titleInput = selectElement("#title");
const suggestionList = selectElement("#suggestions");
const movieList = selectElement("#movie-list");
const rankingList = selectElement("#ranking-list");
const detailsDialog = selectElement("#details-dialog");
const importDialog = selectElement("#import-dialog");

const collections = {
    international: internationalMovies.map(normalizeCatalogMovie),
    polish: polishMovies.map(normalizeCatalogMovie),
};
const catalogById = new Map();

for (const movie of [...collections.international, ...collections.polish]) {
    const existing = catalogById.get(movie.imdbId);
    catalogById.set(movie.imdbId, {
        ...movie,
        imdbRating: movie.imdbRating ?? existing?.imdbRating ?? null,
        filmwebRating: movie.filmwebRating ?? existing?.filmwebRating ?? null,
        aliases: [
            ...new Set(
                [...(existing?.aliases || []), existing?.title, ...movie.aliases].filter(Boolean),
            ),
        ],
    });
}

const catalogMovies = [...catalogById.values()];
const state = {
    movies: [],
    filter: "all",
    collection: "international",
    page: 1,
    suggestion: null,
    suggestions: [],
    suggestionIndex: -1,
    tonightPick: null,
    editingId: null,
    pendingImport: null,
    deletedMovie: null,
    toastTimer: null,
    installPrompt: null,
    storageReadFailed: false,
};

const genreTranslations = {
    dramat: "Drama",
    obyczajowy: "Drama",
    "dramat obyczajowy": "Drama",
    psychologiczny: "Drama",
    "dramat historyczny": "History",
    komedia: "Comedy",
    "komedia obycz": "Comedy",
    "komedia rom": "Romance",
    romans: "Romance",
    melodramat: "Romance",
    wojenny: "War",
    kryminal: "Crime",
    kryminalny: "Crime",
    sensacyjny: "Action",
    przygodowy: "Adventure",
    biograficzny: "Biography",
    historyczny: "History",
    muzyczny: "Music",
    animacja: "Animation",
    "science fiction": "Sci-Fi",
    "sci fi": "Sci-Fi",
    familijny: "Family",
    sportowy: "Sport",
};

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[łŁ]/g, "l")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function validScore(value) {
    const score = Number(value);
    return score > 0 && score <= 10 ? score : null;
}

function safePoster(value) {
    try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function today() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today()) {
        return null;
    }
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
        ? value
        : null;
}

function createId() {
    return (
        globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
}

function normalizeCatalogMovie(movie) {
    return {
        ...movie,
        year: String(movie.year || ""),
        poster: safePoster(movie.poster),
        aliases: Array.isArray(movie.aliases) ? movie.aliases : [],
        imdbRating:
            validScore(movie.imdbRating) ??
            (movie.ratingSource === "IMDb" ? validScore(movie.rating) : null),
        filmwebRating:
            validScore(movie.filmwebRating) ??
            (movie.ratingSource === "Filmweb" ? validScore(movie.rating) : null),
    };
}

function normalizeSavedMovie(movie) {
    const known = catalogById.get(movie.imdbId);
    const watchDates = (Array.isArray(movie.watchDates) ? movie.watchDates : [])
        .map(validDate)
        .filter(Boolean)
        .sort();
    if (!watchDates.length && validDate(movie.dateWatched)) {
        watchDates.push(movie.dateWatched);
    }
    const personalRating = movie.myRating ?? movie.rating;
    return {
        id: createId(),
        imdbId: /^tt\d+$/.test(movie.imdbId || "") ? movie.imdbId : "",
        title: movie.title.trim().slice(0, 120),
        year: String(movie.year || "").slice(0, 4),
        genre: String(movie.genre || "").slice(0, 200),
        poster: safePoster(movie.poster),
        imdbRating:
            validScore(movie.imdbRating) ??
            (movie.ratingSource === "IMDb" ? validScore(movie.externalRating) : null) ??
            known?.imdbRating ??
            null,
        filmwebRating:
            validScore(movie.filmwebRating) ??
            (movie.ratingSource === "Filmweb" ? validScore(movie.externalRating) : null) ??
            known?.filmwebRating ??
            null,
        watched: movie.watched === true,
        favorite: movie.favorite === true,
        myRating:
            movie.watched === true &&
            Number.isInteger(personalRating) &&
            personalRating >= 0 &&
            personalRating <= 5
                ? personalRating
                : 0,
        notes: typeof movie.notes === "string" ? movie.notes.slice(0, MAX_NOTES_LENGTH) : "",
        dateAdded: validDate(movie.dateAdded),
        dateWatched: watchDates.at(-1) || null,
        watchDates,
        watchCount: Math.max(
            Number.isInteger(movie.watchCount) && movie.watchCount >= 0 ? movie.watchCount : 0,
            watchDates.length,
            movie.watched ? 1 : 0,
        ),
    };
}

function sameMovie(savedMovie, candidate) {
    if (savedMovie.imdbId && candidate.imdbId) {
        return savedMovie.imdbId === candidate.imdbId;
    }
    const known =
        catalogById.get(candidate.imdbId) ||
        catalogMovies.find(
            (movie) =>
                [movie.title, ...movie.aliases].some(
                    (title) => normalizeText(title) === normalizeText(candidate.title),
                ) &&
                (!candidate.year ||
                    [movie.year, ...(movie.yearAliases || [])]
                        .map(String)
                        .includes(String(candidate.year))),
        );
    const titles = [
        candidate.title,
        ...(candidate.aliases || []),
        known?.title,
        ...(known?.aliases || []),
    ]
        .filter(Boolean)
        .map(normalizeText);
    const years = [
        candidate.year,
        ...(candidate.yearAliases || []),
        known?.year,
        ...(known?.yearAliases || []),
    ].map(String);
    return (
        titles.includes(normalizeText(savedMovie.title)) &&
        (!savedMovie.year || !candidate.year || years.includes(String(savedMovie.year)))
    );
}

function findSavedMovie(movie) {
    return state.movies.find((savedMovie) => sameMovie(savedMovie, movie));
}

function getGenres(movie) {
    return [
        ...new Set(
            String(movie.genre || "")
                .split(/\s*[/,;]\s*/)
                .filter(Boolean)
                .map((genre) => genreTranslations[normalizeText(genre)] || genre.trim()),
        ),
    ];
}

function loadMovies() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (
            !Array.isArray(saved) ||
            saved.some((movie) => !movie || typeof movie.title !== "string")
        ) {
            throw new Error("Invalid watchlist");
        }
        state.movies = saved.map(normalizeSavedMovie);
    } catch {
        state.storageReadFailed = true;
        selectElement("#storage-status").textContent =
            "Saved data could not be loaded. Existing storage has not been overwritten.";
    }
}

function saveMovies(movies = state.movies) {
    if (state.storageReadFailed) {
        return false;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
        selectElement("#storage-status").textContent = "Saved on this device · Back up in My stats";
        return true;
    } catch {
        selectElement("#storage-status").textContent =
            "Changes are not saved. Keep this tab open and export a backup.";
        return false;
    }
}

function createElement(tag, className = "", text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function createButton(text, className, action) {
    const button = createElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
}

function notify(message, allowUndo = false) {
    clearTimeout(state.toastTimer);
    selectElement("#toast-message").textContent = message;
    selectElement("#undo-button").hidden = !allowUndo;
    selectElement("#toast").hidden = false;
    state.toastTimer = setTimeout(
        () => {
            selectElement("#toast").hidden = true;
            state.deletedMovie = null;
        },
        allowUndo ? 10000 : 4000,
    );
}

function createPoster(movie) {
    const poster = createElement("div", "poster");
    const fallback = createElement("span", "poster-title", movie.title);
    fallback.setAttribute("aria-hidden", "true");
    poster.append(fallback);
    if (safePoster(movie.poster)) {
        const image = createElement("img");
        image.src = movie.poster;
        image.alt = `${movie.title} poster`;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => image.remove());
        poster.append(image);
    }
    return poster;
}

function createPublicRating(movie) {
    const score = movie.imdbRating ?? movie.filmwebRating;
    const source = movie.imdbRating !== null && movie.imdbRating !== undefined ? "IMDb" : "Filmweb";
    return createElement(
        "p",
        "catalog-rating",
        score ? `★ ${source} ${score} / 10` : "Public score unavailable",
    );
}

function refreshApp() {
    renderGenreOptions();
    renderMovies();
    renderRankings();
    renderStatistics();
    updatePickerCount();
    if (state.tonightPick) {
        renderTonightPick();
    }
}

function updateMovies() {
    saveMovies();
    refreshApp();
}

function recordViewing(movie) {
    movie.watchDates.push(today());
    movie.dateWatched = today();
    movie.watchCount++;
    movie.watched = true;
}

function toggleWatched(movie) {
    if (movie.watched) {
        movie.watched = false;
        movie.myRating = 0;
    } else {
        recordViewing(movie);
    }
    updateMovies();
    notify(
        movie.watched
            ? "Marked watched. Choose your star rating."
            : "Moved to your unwatched list. Personal rating cleared.",
    );
}

function deleteMovie(movie) {
    state.deletedMovie = { movie, index: state.movies.indexOf(movie) };
    state.movies = state.movies.filter((savedMovie) => savedMovie.id !== movie.id);
    updateMovies();
    notify("Movie removed", true);
    selectElement("#undo-button").focus();
}

function focusMovieControl(movie, className) {
    const card = [...movieList.children].find((element) => element.dataset.movieId === movie.id);
    (card?.querySelector(className) || selectElement(".filters [aria-pressed='true']"))?.focus();
}

function createPersonalRating(movie) {
    const rating = createElement("div", "rating");
    rating.setAttribute("role", "group");
    rating.setAttribute("aria-label", `Rate ${movie.title}`);
    for (let score = 1; score <= 5; score++) {
        const star = createButton(
            "★",
            `star star-${score}${score <= movie.myRating ? " filled" : ""}`,
            () => {
                movie.myRating = movie.myRating === score ? 0 : score;
                updateMovies();
                focusMovieControl(movie, `.star-${score}`);
            },
        );
        star.disabled = !movie.watched;
        star.setAttribute("aria-label", `${score} out of 5 stars. Select again to clear.`);
        star.setAttribute("aria-pressed", String(movie.myRating === score));
        rating.append(star);
    }
    return rating;
}

function createMovieCard(movie) {
    const card = createElement("article", "movie-card");
    card.dataset.movieId = movie.id;
    const poster = createPoster(movie);
    poster.append(
        createElement(
            "span",
            `badge${movie.watched ? " watched" : ""}`,
            movie.watched ? "✓ Watched" : "Want to watch",
        ),
    );
    const favorite = createButton(movie.favorite ? "♥" : "♡", "favorite-button", () => {
        movie.favorite = !movie.favorite;
        updateMovies();
        focusMovieControl(movie, ".favorite-button");
    });
    favorite.setAttribute("aria-label", `Favorite ${movie.title}`);
    favorite.setAttribute("aria-pressed", String(movie.favorite));
    poster.append(favorite);
    const body = createElement("div", "card-body");
    body.append(createElement("h2", "", movie.title));
    body.append(
        createElement("p", "metadata", [movie.year, movie.genre].filter(Boolean).join(" · ")),
    );
    body.append(createPublicRating(movie), createPersonalRating(movie));
    body.append(
        createElement(
            "span",
            "rating-label",
            movie.watched
                ? `${movie.myRating || "Unrated"} / 5 · Your rating`
                : "Mark watched to rate",
        ),
    );
    const actions = createElement("div", "card-actions");
    const watchButton = createButton(
        movie.watched ? "↶ Watch again" : "✓ Mark watched",
        "watch-button",
        () => {
            toggleWatched(movie);
            focusMovieControl(movie, ".watch-button");
        },
    );
    const deleteButton = createButton("×", "delete-button", () => deleteMovie(movie));
    deleteButton.setAttribute("aria-label", `Delete ${movie.title}`);
    actions.append(watchButton, deleteButton);
    body.append(
        actions,
        createButton("Notes & history", "details-button", () => openDetails(movie)),
    );
    card.append(poster, body);
    return card;
}

function filterMovies() {
    const query = normalizeText(selectElement("#search").value);
    const genre = selectElement("#watchlist-genre").value;
    return state.movies.filter((movie) => {
        const statusMatches =
            state.filter === "all" ||
            (state.filter === "favorites" && movie.favorite) ||
            (state.filter === "watched" && movie.watched) ||
            (state.filter === "pending" && !movie.watched);
        return (
            statusMatches &&
            normalizeText(movie.title).includes(query) &&
            (!genre || getGenres(movie).includes(genre))
        );
    });
}

function sortMovies(movies) {
    const sorters = {
        newest: (first, second) =>
            String(second.dateAdded || "").localeCompare(String(first.dateAdded || "")),
        title: (first, second) => first.title.localeCompare(second.title),
        year: (first, second) => Number(second.year || 0) - Number(first.year || 0),
        imdb: (first, second) => (second.imdbRating ?? -1) - (first.imdbRating ?? -1),
        personal: (first, second) => second.myRating - first.myRating,
    };
    return [...movies].sort(sorters[selectElement("#watchlist-sort").value] || sorters.newest);
}

function average(values) {
    return values.length
        ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
        : "—";
}

function renderMovies() {
    const watched = state.movies.filter((movie) => movie.watched);
    const rated = watched.filter((movie) => movie.myRating > 0);
    selectElement("#total-count").textContent = state.movies.length;
    selectElement("#watched-count").textContent = watched.length;
    selectElement("#pending-count").textContent = state.movies.length - watched.length;
    selectElement("#average-rating").textContent = average(rated.map((movie) => movie.myRating));
    const visibleMovies = sortMovies(filterMovies());
    movieList.replaceChildren(...visibleMovies.map(createMovieCard));
    selectElement("#result-count").textContent =
        `${visibleMovies.length} of ${state.movies.length} movies`;
    selectElement("#empty-state").hidden = visibleMovies.length > 0;
    selectElement("#empty-title").textContent = state.movies.length
        ? "No matching films."
        : "Your next favorite is waiting.";
    selectElement("#empty-description").textContent = state.movies.length
        ? "Try another search, genre or filter."
        : "Add a movie to start your collection.";
}

function addMovie(movie, watched = false) {
    if (findSavedMovie(movie)) {
        notify("This movie is already in your watchlist.");
        return false;
    }
    const savedMovie = normalizeSavedMovie({
        ...movie,
        watched: false,
        myRating: 0,
        dateAdded: today(),
    });
    if (watched) {
        recordViewing(savedMovie);
    }
    state.movies.unshift(savedMovie);
    updateMovies();
    notify(`${savedMovie.title} added to your watchlist`);
    return true;
}

function createRankingCard(movie) {
    const card = createElement("article", "movie-card ranking-card");
    const poster = createPoster(movie);
    poster.append(
        createElement("span", `rank-number${movie.rank <= 3 ? " podium" : ""}`, `#${movie.rank}`),
    );
    const body = createElement("div", "card-body");
    body.append(createElement("h3", "catalog-title", movie.title));
    body.append(
        createElement("p", "metadata", [movie.year, movie.genre].filter(Boolean).join(" · ")),
    );
    body.append(createPublicRating(movie));
    const link = createElement("a", "imdb-link", "View on IMDb ↗");
    link.href = `https://www.imdb.com/title/${movie.imdbId}/`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const added = Boolean(findSavedMovie(movie));
    const addButton = createButton(
        added ? "✓ In your watchlist" : "＋ Add to watchlist",
        "catalog-add",
        () => {
            if (addMovie(movie)) {
                selectElement(`[data-catalog-id="${movie.imdbId}"]`)?.focus();
            }
        },
    );
    addButton.dataset.catalogId = movie.imdbId;
    addButton.setAttribute("aria-disabled", String(added));
    body.append(link, addButton);
    card.append(poster, body);
    return card;
}

function renderRankings() {
    const collection = collections[state.collection];
    const info = catalogInfo[state.collection];
    const query = normalizeText(selectElement("#ranking-search").value);
    const matchingMovies = collection.filter((movie) =>
        [movie.title, ...movie.aliases].some((title) => normalizeText(title).includes(query)),
    );
    const pageCount = Math.max(1, Math.ceil(matchingMovies.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pageCount);
    selectElement("#collection-title").textContent = info.title;
    selectElement("#collection-description").textContent = info.description;
    const source = createElement("a", "", info.sourceLabel);
    source.href = info.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    selectElement("#ranking-source").replaceChildren(
        document.createTextNode(`${info.snapshot} · `),
        source,
        document.createTextNode(` · ${info.note}`),
    );
    selectElement("#ranking-count").textContent =
        `${matchingMovies.length} of ${collection.length} films`;
    selectElement("#collection-progress").textContent =
        `${collection.filter(findSavedMovie).length} / ${collection.length} saved`;
    selectElement("#ranking-empty").hidden = matchingMovies.length > 0;
    selectElement("#page-info").textContent = `${state.page} / ${pageCount}`;
    selectElement("#previous-page").disabled = state.page === 1;
    selectElement("#next-page").disabled = state.page === pageCount;
    rankingList.replaceChildren(
        ...matchingMovies
            .slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)
            .map(createRankingCard),
    );
}

function closeSuggestions() {
    suggestionList.hidden = true;
    suggestionList.replaceChildren();
    titleInput.setAttribute("aria-expanded", "false");
    titleInput.removeAttribute("aria-activedescendant");
    state.suggestionIndex = -1;
}

function chooseSuggestion(movie) {
    state.suggestion = movie;
    titleInput.value = movie.title;
    titleInput.setCustomValidity("");
    selectElement("#year").value = movie.year;
    selectElement("#genre").value = movie.genre || "";
    selectElement("#poster").value = movie.poster || "";
    selectElement("#selected-movie").textContent = findSavedMovie(movie)
        ? "Already in your watchlist."
        : "✓ Movie details filled in";
    selectElement("#selected-movie").hidden = false;
    closeSuggestions();
    titleInput.focus();
}

function showSuggestions() {
    closeSuggestions();
    const query = normalizeText(titleInput.value);
    state.suggestions =
        query.length >= 2
            ? catalogMovies
                  .filter((movie) =>
                      [movie.title, ...movie.aliases].some((title) =>
                          normalizeText(title).includes(query),
                      ),
                  )
                  .slice(0, MAX_SUGGESTIONS)
            : [];
    if (!state.suggestions.length) {
        return;
    }
    suggestionList.hidden = false;
    titleInput.setAttribute("aria-expanded", "true");
    state.suggestions.forEach((movie, index) => {
        const option = createElement("div", "suggestion");
        option.id = `suggestion-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const thumbnail = createPoster(movie);
        thumbnail.className = "suggestion-thumb";
        const text = createElement("div");
        text.append(
            createElement("strong", "", movie.title),
            createElement(
                "small",
                "",
                `${movie.year} · ${movie.imdbRating ? `IMDb ${movie.imdbRating}` : "Polish collection"}`,
            ),
        );
        option.append(thumbnail, text);
        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("click", () => chooseSuggestion(movie));
        suggestionList.append(option);
    });
}

function handleSuggestionKeys(event) {
    if (event.key === "Escape" && !suggestionList.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeSuggestions();
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        if (suggestionList.hidden) {
            showSuggestions();
        }
        if (!state.suggestions.length) {
            return;
        }
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        state.suggestionIndex =
            state.suggestionIndex < 0
                ? direction === 1
                    ? 0
                    : state.suggestions.length - 1
                : (state.suggestionIndex + direction + state.suggestions.length) %
                  state.suggestions.length;
        [...suggestionList.children].forEach((option, index) =>
            option.setAttribute("aria-selected", String(index === state.suggestionIndex)),
        );
        const option = suggestionList.children[state.suggestionIndex];
        titleInput.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && !suggestionList.hidden && state.suggestionIndex >= 0) {
        event.preventDefault();
        chooseSuggestion(state.suggestions[state.suggestionIndex]);
    } else if (event.key === "Tab") {
        closeSuggestions();
    }
}

function openMovieForm() {
    movieForm.reset();
    state.suggestion = null;
    selectElement("#selected-movie").hidden = true;
    titleInput.setCustomValidity("");
    selectElement("#poster").setCustomValidity("");
    closeSuggestions();
    movieDialog.showModal();
}

function submitMovie(event) {
    event.preventDefault();
    const title = titleInput.value.trim();
    const poster = selectElement("#poster").value.trim();
    titleInput.setCustomValidity(title ? "" : "Enter a movie title.");
    selectElement("#poster").setCustomValidity(
        poster && !safePoster(poster) ? "Use a direct HTTP or HTTPS image URL." : "",
    );
    if (!movieForm.reportValidity()) {
        return;
    }
    const selected =
        state.suggestion &&
        normalizeText(title) === normalizeText(state.suggestion.title) &&
        selectElement("#year").value === state.suggestion.year
            ? state.suggestion
            : null;
    const movie = {
        ...selected,
        title,
        year: selectElement("#year").value,
        genre: selectElement("#genre").value.trim(),
        poster: safePoster(poster),
    };
    if (!addMovie(movie, selectElement("#already-watched").checked)) {
        return;
    }
    state.filter = "all";
    selectElement("#search").value = "";
    selectElement("#watchlist-genre").value = "";
    updateFilterButtons();
    renderMovies();
    movieDialog.close();
    location.hash = "watchlist";
    showView();
}

function openDetails(movie) {
    state.editingId = movie.id;
    selectElement("#details-title").textContent = movie.title;
    selectElement("#details-notes").value = movie.notes;
    selectElement("#details-date").value = movie.dateWatched || "";
    selectElement("#details-date").max = today();
    selectElement("#details-history").textContent =
        `${movie.watchCount} viewings · Added ${movie.dateAdded || "before date tracking"}`;
    selectElement("#log-rewatch").hidden = !movie.watched;
    detailsDialog.showModal();
}

function saveDetails(event) {
    event.preventDefault();
    const movie = state.movies.find((movie) => movie.id === state.editingId);
    const date = selectElement("#details-date").value || null;
    if (!movie || (date && !validDate(date))) {
        return;
    }
    movie.notes = selectElement("#details-notes").value.trim().slice(0, MAX_NOTES_LENGTH);
    if (date !== movie.dateWatched) {
        const previousIndex = movie.watchDates.lastIndexOf(movie.dateWatched);
        if (previousIndex >= 0) {
            movie.watchDates.splice(previousIndex, 1);
        }
        if (date) {
            movie.watchDates.push(date);
            movie.watched = true;
            movie.watchCount = Math.max(1, movie.watchCount, movie.watchDates.length);
        }
        movie.watchDates.sort();
        movie.dateWatched = movie.watchDates.at(-1) || null;
    }
    updateMovies();
    detailsDialog.close();
    notify("Notes and viewing date saved");
}

function renderGenreOptions() {
    const genres = [...new Set([...catalogMovies, ...state.movies].flatMap(getGenres))].sort();
    for (const selector of ["#watchlist-genre", "#picker-genre"]) {
        const dropdown = selectElement(selector);
        const previous = dropdown.value;
        dropdown.replaceChildren(
            new Option("Any genre", ""),
            ...genres.map((genre) => new Option(genre, genre)),
        );
        dropdown.value = genres.includes(previous) ? previous : "";
    }
}

function getPickerCandidates() {
    const source = selectElement("#picker-source").value;
    const candidates =
        source === "saved"
            ? state.movies
            : collections[source] || [...state.movies, ...catalogMovies];
    const minimum = Number(selectElement("#picker-rating").value);
    const genre = selectElement("#picker-genre").value;
    const onlyUnwatched = selectElement("#picker-unwatched").checked;
    const unique = new Map();
    for (const candidate of candidates) {
        const movie = findSavedMovie(candidate) || catalogById.get(candidate.imdbId) || candidate;
        unique.set(movie.imdbId || `${normalizeText(movie.title)}|${movie.year}`, movie);
    }
    return [...unique.values()].filter(
        (movie) =>
            (!onlyUnwatched || !findSavedMovie(movie)?.watched) &&
            (!genre || getGenres(movie).includes(genre)) &&
            (!minimum || (movie.imdbRating !== null && movie.imdbRating >= minimum)),
    );
}

function updatePickerCount() {
    selectElement("#picker-count").textContent = `${getPickerCandidates().length} matching films`;
}

function pickMovie() {
    const candidates = getPickerCandidates();
    if (!candidates.length) {
        state.tonightPick = null;
        selectElement("#tonight-result").replaceChildren(
            createElement("h2", "", "No matches this time."),
            createElement("p", "", "Try Any rating, another genre, or both collections."),
        );
        return;
    }
    const alternatives = candidates.filter(
        (movie) => !state.tonightPick || !sameMovie(movie, state.tonightPick),
    );
    const pool = alternatives.length ? alternatives : candidates;
    state.tonightPick = pool[Math.floor(Math.random() * pool.length)];
    renderTonightPick();
}

function renderTonightPick() {
    const movie = findSavedMovie(state.tonightPick) || state.tonightPick;
    const saved = findSavedMovie(movie);
    const content = createElement("div", "pick-content");
    const poster = createPoster(movie);
    poster.classList.add("pick-poster");
    const info = createElement("div", "pick-info");
    info.append(
        createElement("h2", "", movie.title),
        createElement("p", "metadata", [movie.year, movie.genre].filter(Boolean).join(" · ")),
    );
    info.append(
        createElement(
            "p",
            "catalog-rating",
            movie.imdbRating ? `★ IMDb ${movie.imdbRating} / 10` : "IMDb score unavailable",
        ),
    );
    info.append(
        createButton(
            !saved ? "＋ Add to watchlist" : saved.watched ? "Log another watch" : "✓ Mark watched",
            "primary",
            () => {
                const current = findSavedMovie(movie);
                if (!current) {
                    addMovie(movie);
                } else {
                    recordViewing(current);
                    updateMovies();
                    notify("Viewing recorded for today");
                }
            },
        ),
    );
    content.append(poster, info);
    selectElement("#tonight-result").replaceChildren(
        createElement("span", "eyebrow", "TONIGHT’S PICK"),
        content,
    );
}

function getStatistics() {
    const watched = state.movies.filter((movie) => movie.watched);
    const genres = new Map();
    watched.forEach((movie) =>
        getGenres(movie).forEach((genre) => genres.set(genre, (genres.get(genre) || 0) + 1)),
    );
    const maximum = Math.max(0, ...genres.values());
    return {
        saved: state.movies.length,
        watched: watched.length,
        pending: state.movies.length - watched.length,
        favorites: state.movies.filter((movie) => movie.favorite).length,
        imdbAverage: average(
            state.movies.map((movie) => movie.imdbRating).filter((rating) => rating !== null),
        ),
        personalAverage: average(
            watched.filter((movie) => movie.myRating > 0).map((movie) => movie.myRating),
        ),
        mostWatchedGenre:
            [...genres]
                .filter(([, count]) => count === maximum)
                .map(([genre]) => genre)
                .sort()
                .join(" / ") || "—",
        thisMonth: state.movies.filter((movie) =>
            movie.watchDates.some((date) => date.startsWith(today().slice(0, 7))),
        ).length,
        viewings: state.movies.reduce((total, movie) => total + movie.watchCount, 0),
    };
}

function renderStatistics() {
    const statistics = getStatistics();
    const cards = [
        ["Movies saved", statistics.saved],
        ["Watched", statistics.watched],
        ["Still to watch", statistics.pending],
        ["Favorites", statistics.favorites],
        ["Average IMDb score", `${statistics.imdbAverage} / 10`],
        ["Your average rating", `${statistics.personalAverage} / 5`],
        ["Most watched genre", statistics.mostWatchedGenre],
        ["Watched this month", statistics.thisMonth],
        ["Total viewings", statistics.viewings],
    ];
    selectElement("#insights-grid").replaceChildren(
        ...cards.map(([label, value]) => {
            const card = createElement("div", "surface insight");
            card.append(
                createElement("span", "insight-label", label),
                createElement("strong", "insight-value", String(value)),
            );
            return card;
        }),
    );
}

function exportBackup() {
    const backup = {
        app: "aftercredits",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        movies: state.movies,
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 4)], { type: "application/json" }),
    );
    const link = createElement("a");
    link.href = url;
    link.download = `aftercredits-backup-${today()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    selectElement("#backup-status").textContent =
        "Backup download requested. Keep the JSON file somewhere safe.";
}

function validateBackup(payload) {
    const movies = Array.isArray(payload)
        ? payload
        : payload?.app === "aftercredits" && [2, BACKUP_VERSION].includes(payload.version)
          ? payload.movies
          : null;
    if (!Array.isArray(movies) || movies.length > MAX_BACKUP_MOVIES) {
        throw new Error("Choose an Aftercredits backup with at most 10,000 films.");
    }
    return movies.map((movie, index) => {
        const invalid = (message) => {
            throw new Error(`Film ${index + 1}: ${message}`);
        };
        if (
            !movie ||
            typeof movie.title !== "string" ||
            !movie.title.trim() ||
            movie.title.length > 120
        ) {
            invalid("invalid title");
        }
        const rating = movie.myRating ?? movie.rating ?? 0;
        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            invalid("personal rating must be between 0 and 5");
        }
        if (
            movie.year &&
            (!/^\d{4}$/.test(String(movie.year)) ||
                Number(movie.year) < 1888 ||
                Number(movie.year) > 2100)
        ) {
            invalid("invalid year");
        }
        for (const key of ["watched", "favorite"]) {
            if (movie[key] !== undefined && typeof movie[key] !== "boolean") {
                invalid(`invalid ${key} value`);
            }
        }
        for (const key of ["dateAdded", "dateWatched"]) {
            if (movie[key] && !validDate(movie[key])) {
                invalid("invalid date");
            }
        }
        if (
            movie.watchDates !== undefined &&
            (!Array.isArray(movie.watchDates) ||
                movie.watchDates.length > 10000 ||
                movie.watchDates.some((date) => !validDate(date)))
        ) {
            invalid("invalid viewing dates");
        }
        if (
            movie.watchCount !== undefined &&
            (!Number.isInteger(movie.watchCount) ||
                movie.watchCount < 0 ||
                movie.watchCount > 100000)
        ) {
            invalid("invalid viewing count");
        }
        if (
            movie.notes !== undefined &&
            (typeof movie.notes !== "string" || movie.notes.length > MAX_NOTES_LENGTH)
        ) {
            invalid("invalid notes");
        }
        return normalizeSavedMovie(movie);
    });
}

async function previewImport(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    try {
        if (file.size > MAX_BACKUP_BYTES) {
            throw new Error("Choose a backup smaller than 10 MB.");
        }
        state.pendingImport = validateBackup(JSON.parse(await file.text()));
        selectElement("#import-summary").textContent =
            `${state.pendingImport.length} films found. Choose how to import them.`;
        selectElement("#import-mode").value = "merge";
        updateImportWarning();
        importDialog.showModal();
    } catch (error) {
        state.pendingImport = null;
        selectElement("#backup-status").textContent =
            `Import failed: ${error.message} Your list was not changed.`;
    } finally {
        event.target.value = "";
    }
}

function updateImportWarning() {
    selectElement("#import-warning").textContent =
        selectElement("#import-mode").value === "replace"
            ? "Replace removes your current list and uses the backup. Export your current list first if you want to keep it."
            : "Merge adds missing films. Existing films keep their notes, ratings and viewing history.";
}

function importBackup(event) {
    event.preventDefault();
    if (!state.pendingImport) {
        return;
    }
    const result = selectElement("#import-mode").value === "replace" ? [] : [...state.movies];
    let added = 0;
    for (const movie of state.pendingImport) {
        if (!result.some((savedMovie) => sameMovie(savedMovie, movie))) {
            result.push(movie);
            added++;
        }
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
        selectElement("#import-warning").textContent =
            "Import could not be saved. Your existing list was not changed.";
        return;
    }
    state.movies = result;
    state.storageReadFailed = false;
    state.pendingImport = null;
    state.deletedMovie = null;
    state.tonightPick = null;
    state.filter = "all";
    selectElement("#search").value = "";
    selectElement("#watchlist-genre").value = "";
    updateFilterButtons();
    updateMovies();
    importDialog.close();
    selectElement("#backup-status").textContent =
        `${added} films imported. Matching duplicates were skipped.`;
}

function updateFilterButtons() {
    selectElements("[data-filter]").forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter)),
    );
}

function showView() {
    const requested = location.hash.slice(1);
    const view = ["rankings", "tonight", "insights"].includes(requested) ? requested : "watchlist";
    for (const name of ["watchlist", "rankings", "tonight", "insights"]) {
        selectElement(`#${name}-view`).hidden = name !== view;
    }
    selectElements("[data-view]").forEach((link) => {
        if (link.dataset.view === view) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function setupMovieEvents() {
    for (const selector of ["#add-button", "#empty-add", "#nav-add"]) {
        selectElement(selector).addEventListener("click", openMovieForm);
    }
    for (const selector of ["#close-dialog", "#cancel-dialog"]) {
        selectElement(selector).addEventListener("click", () => movieDialog.close());
    }
    movieForm.addEventListener("submit", submitMovie);
    titleInput.addEventListener("keydown", handleSuggestionKeys);
    titleInput.addEventListener("input", () => {
        titleInput.setCustomValidity("");
        if (state.suggestion) {
            selectElement("#year").value = "";
            selectElement("#genre").value = "";
            selectElement("#poster").value = "";
        }
        state.suggestion = null;
        selectElement("#selected-movie").hidden = true;
        showSuggestions();
    });
    selectElement("#poster").addEventListener("input", () =>
        selectElement("#poster").setCustomValidity(""),
    );
    movieDialog.addEventListener("close", closeSuggestions);
    movieForm.addEventListener("click", (event) => {
        if (!event.target.closest(".suggestion-field")) {
            closeSuggestions();
        }
    });
    selectElement("#search").addEventListener("input", renderMovies);
    for (const selector of ["#watchlist-genre", "#watchlist-sort"]) {
        selectElement(selector).addEventListener("change", renderMovies);
    }
    selectElements("[data-filter]").forEach((button) =>
        button.addEventListener("click", () => {
            state.filter = button.dataset.filter;
            updateFilterButtons();
            renderMovies();
        }),
    );
    selectElement("#undo-button").addEventListener("click", () => {
        if (!state.deletedMovie) {
            return;
        }
        state.movies.splice(state.deletedMovie.index, 0, state.deletedMovie.movie);
        state.deletedMovie = null;
        updateMovies();
        notify("Movie restored");
    });
}

function setupCollectionEvents() {
    selectElements("[data-collection]").forEach((button) =>
        button.addEventListener("click", () => {
            state.collection = button.dataset.collection;
            state.page = 1;
            selectElement("#ranking-search").value = "";
            selectElements("[data-collection]").forEach((tab) =>
                tab.setAttribute("aria-pressed", String(tab === button)),
            );
            renderRankings();
        }),
    );
    selectElement("#ranking-search").addEventListener("input", () => {
        state.page = 1;
        renderRankings();
    });
    for (const [selector, direction] of [
        ["#previous-page", -1],
        ["#next-page", 1],
    ]) {
        selectElement(selector).addEventListener("click", () => {
            state.page += direction;
            renderRankings();
            selectElement("#collection-title").scrollIntoView({ block: "start" });
        });
    }
    selectElement("#picker-form").addEventListener("submit", (event) => {
        event.preventDefault();
        pickMovie();
    });
    selectElement("#picker-form").addEventListener("change", () => {
        state.tonightPick = null;
        updatePickerCount();
        selectElement("#tonight-result").replaceChildren(
            createElement("h2", "", "Ready for a new pick."),
            createElement("p", "", "Press Pick a movie to use these preferences."),
        );
    });
}

function setupDetailsAndBackups() {
    selectElement("#details-form").addEventListener("submit", saveDetails);
    for (const selector of ["#close-details", "#cancel-details"]) {
        selectElement(selector).addEventListener("click", () => detailsDialog.close());
    }
    selectElement("#log-rewatch").addEventListener("click", () => {
        const movie = state.movies.find((movie) => movie.id === state.editingId);
        if (movie) {
            movie.notes = selectElement("#details-notes").value.trim().slice(0, MAX_NOTES_LENGTH);
            recordViewing(movie);
            updateMovies();
            detailsDialog.close();
            notify("Another viewing recorded for today");
        }
    });
    selectElement("#export-backup").addEventListener("click", exportBackup);
    selectElement("#import-backup").addEventListener("click", () =>
        selectElement("#backup-file").click(),
    );
    selectElement("#backup-file").addEventListener("change", previewImport);
    selectElement("#import-mode").addEventListener("change", updateImportWarning);
    selectElement("#import-form").addEventListener("submit", importBackup);
    selectElement("#cancel-import").addEventListener("click", () => {
        state.pendingImport = null;
        importDialog.close();
    });
}

function setupInstall() {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        state.installPrompt = event;
        selectElement("#install-app").hidden = false;
    });
    selectElement("#install-app").addEventListener("click", async () => {
        if (state.installPrompt) {
            await state.installPrompt.prompt();
            await state.installPrompt.userChoice;
            state.installPrompt = null;
            selectElement("#install-app").hidden = true;
        }
    });
    window.addEventListener("appinstalled", () => {
        selectElement("#install-app").hidden = true;
        selectElement("#install-help").textContent =
            "Aftercredits is installed. Open it from your home screen.";
    });
    if (
        "serviceWorker" in navigator &&
        (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))
    ) {
        navigator.serviceWorker
            .register("./sw.js")
            .then(() => navigator.serviceWorker.ready)
            .then(() => {
                selectElement("#offline-status").textContent =
                    "Ready for offline use. Remote posters may still need internet.";
            })
            .catch(() => {
                selectElement("#offline-status").textContent =
                    "Offline setup is unavailable here. Your list still saves in this browser.";
            });
    }
}

loadMovies();
setupMovieEvents();
setupCollectionEvents();
setupDetailsAndBackups();
setupInstall();
refreshApp();
showView();
window.addEventListener("hashchange", () => {
    showView();
    window.scrollTo({ top: 0 });
});
