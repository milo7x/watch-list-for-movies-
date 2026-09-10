const $ = (selector) => document.querySelector(selector);
const storageKey = "aftercredits.movies.v1";
const dialog = $("#movie-dialog");
const form = $("#movie-form");

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
  $("#title").setCustomValidity("");
  $("#poster").setCustomValidity("");
  dialog.showModal();
}

$("#add-button").addEventListener("click", openForm);
$("#empty-add").addEventListener("click", openForm);

$("#close-dialog").addEventListener("click", () => dialog.close());
$("#cancel-dialog").addEventListener("click", () => dialog.close());

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

  movies.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    year: $("#year").value,
    genre: $("#genre").value.trim(),
    poster: safePoster(poster),
    watched: $("#already-watched").checked,
    rating: 0
  });

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
