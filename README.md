# Aftercredits

[English](#english) · [Polski](#polski)

## English

A responsive movie watchlist built with HTML, CSS and JavaScript. Discover films, record your viewing history and keep your collection on your computer or phone.

### Features

| Feature | What you can do |
| --- | --- |
| Personal watchlist | Add films manually or choose suggestions while typing. |
| Film collections | Browse 100 international and 100 Polish films with images and public scores. |
| Ratings and favorites | Mark films watched, give 1–5 stars and save your favorites. |
| Notes and history | Write notes, edit viewing dates and record repeat watches. |
| Search and discovery | Search, filter, sort and randomly pick a film by genre and minimum IMDb score. |
| Statistics | View totals, average ratings, most watched genres and monthly activity. |
| Backups | Export and import your collection as a JSON file. |
| Mobile support | Use the responsive layout and install the website on your home screen. |

### Getting started

1. Download the project and open its folder in Visual Studio Code.
2. Keep the files below together, including the `icons` folder.
3. Use the Live Server extension to open `index.html`.

No build step, movie API key or database is required. When updating the project, keep the same browser and website address to access your existing list.

### Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, navigation and forms |
| `style.css` | Dark theme and responsive layout |
| `script.js` | Watchlist features, statistics and backups |
| `movies.js` | Film collections and source information |
| `manifest.webmanifest` | App name, icons and installation settings |
| `sw.js` | Caching app files for offline use |
| `icons/` | Browser and home screen icons |
| `README.md` | Project documentation |

### Technologies

HTML5, CSS3, vanilla JavaScript, `localStorage`, Web App Manifest and Service Worker. CSS Grid, Flexbox and media queries adapt the layout to different screens.

### Install on your phone

Publish the project to an HTTPS host, such as GitHub Pages, and open the website address on your phone.

| Device | Installation |
| --- | --- |
| iPhone | Open in Safari → Share → Add to Home Screen → Add. |
| Android | Open in Chrome → browser menu → Install app or Add to home screen → confirm. |

Installation options depend on your browser. After the first online visit, wait for the offline-ready message in the statistics section. App pages and catalogue text can then work offline; remote images may still need internet.

### Saving and scores

Your list is stored in the current browser using `localStorage`. **Computer and phone lists are separate.** Export a backup and import it on another device to transfer a copy. Merging preserves existing film details; replacing overwrites the list. Clearing site data removes your saved collection.

Personal ratings use **1–5 stars**. IMDb and Filmweb scores use **1–10** and remain separate. Films without IMDb scores are included in the random picker only when no minimum rating is required.

### Data sources

The collections are saved snapshots, not live popularity rankings. Selection rules and snapshot details are recorded in `movies.js`. Some images are film stills rather than posters.

[IMDb](https://www.imdb.com/chart/top/) · [Ranking reference](https://de.wikipedia.org/wiki/IMDb_Top_250_Movies) · [Filmweb](https://www.filmweb.pl/ranking/film/country/42) · [Cinemeta](https://github.com/Stremio/cinemeta) · [Image archive](https://github.com/theapache64/top250)

### Future improvements

Optional synchronization between devices, custom collections and a light theme.

---

## Polski

Responsywna lista filmów napisana w HTML, CSS i JavaScript. Odkrywaj filmy, zapisuj historię oglądania i korzystaj ze swojej kolekcji na komputerze lub telefonie.

### Funkcje

| Funkcja | Możliwości |
| --- | --- |
| Osobista lista | Dodawanie filmów ręcznie lub wybieranie podpowiedzi podczas wpisywania tytułu. |
| Kolekcje filmowe | Przeglądanie 100 filmów międzynarodowych i 100 polskich wraz z obrazami i ocenami. |
| Oceny i ulubione | Oznaczanie obejrzanych filmów, przyznawanie 1–5 gwiazdek i zapisywanie ulubionych. |
| Notatki i historia | Zapisywanie notatek, zmienianie dat i rejestrowanie kolejnych seansów. |
| Wyszukiwanie i odkrywanie | Wyszukiwanie, filtrowanie, sortowanie i losowanie filmu według gatunku oraz minimalnej oceny IMDb. |
| Statystyki | Podsumowania kolekcji, średnie ocen, najczęściej oglądane gatunki i aktywność miesięczna. |
| Kopie zapasowe | Eksportowanie i importowanie kolekcji w pliku JSON. |
| Obsługa telefonu | Responsywny układ i instalacja strony na ekranie głównym. |

### Uruchomienie

1. Pobierz projekt i otwórz jego folder w Visual Studio Code.
2. Zachowaj razem wymienione poniżej pliki oraz folder `icons`.
3. Uruchom `index.html` za pomocą rozszerzenia Live Server.

Nie potrzebujesz kompilacji, klucza API ani bazy danych. Przy aktualizacji korzystaj z tej samej przeglądarki i tego samego adresu strony, aby zachować dostęp do zapisanej listy.

### Pliki projektu

| Plik | Zastosowanie |
| --- | --- |
| `index.html` | Układ strony, nawigacja i formularze |
| `style.css` | Ciemny motyw i responsywny układ |
| `script.js` | Funkcje listy, statystyki i kopie zapasowe |
| `movies.js` | Kolekcje filmów i informacje o źródłach |
| `manifest.webmanifest` | Nazwa aplikacji, ikony i ustawienia instalacji |
| `sw.js` | Zapisywanie plików aplikacji do działania bez internetu |
| `icons/` | Ikony przeglądarki i ekranu głównego |
| `README.md` | Dokumentacja projektu |

### Technologie

HTML5, CSS3, czysty JavaScript, `localStorage`, manifest aplikacji internetowej i mechanizm obsługi pracy bez połączenia. Siatka CSS, układ elastyczny i zapytania medialne dopasowują stronę do wielkości ekranu.

### Instalacja na telefonie

Opublikuj projekt na serwerze obsługującym HTTPS, np. w GitHub Pages, i otwórz adres strony na telefonie.

| Urządzenie | Instalacja |
| --- | --- |
| iPhone | Otwórz w Safari → Udostępnij → Do ekranu początkowego → Dodaj. |
| Android | Otwórz w Chrome → menu przeglądarki → Zainstaluj aplikację lub Dodaj do ekranu głównego → potwierdź. |

Dostępne opcje zależą od przeglądarki. Po pierwszym wejściu z internetem poczekaj na komunikat gotowości do pracy bez połączenia w części ze statystykami. Strona i tekst kolekcji mogą wtedy działać bez internetu; zdalne obrazy mogą nadal wymagać połączenia.

### Zapis i oceny

Lista jest zapisywana w bieżącej przeglądarce za pomocą `localStorage`. **Komputer i telefon mają osobne listy.** Wyeksportuj kopię i zaimportuj ją na drugim urządzeniu, aby przenieść dane. Łączenie zachowuje informacje o istniejących filmach, a zastępowanie nadpisuje listę. Wyczyszczenie danych strony usuwa zapisaną kolekcję.

Twoje oceny mają skalę **1–5 gwiazdek**. Oceny IMDb i Filmwebu mają skalę **1–10** i pozostają oddzielne. Filmy bez oceny IMDb są uwzględniane w losowaniu tylko wtedy, gdy nie ustawiono minimalnej oceny.

### Źródła danych

Kolekcje są zapisanymi zestawieniami, a nie rankingami popularności aktualizowanymi na żywo. Zasady wyboru i informacje o datach zestawień znajdują się w `movies.js`. Niektóre obrazy są kadrami zamiast plakatów.

[IMDb](https://www.imdb.com/chart/top/) · [Źródło kolejności](https://de.wikipedia.org/wiki/IMDb_Top_250_Movies) · [Filmweb](https://www.filmweb.pl/ranking/film/country/42) · [Cinemeta](https://github.com/Stremio/cinemeta) · [Archiwum obrazów](https://github.com/theapache64/top250)

### Plany rozwoju

Opcjonalna synchronizacja między urządzeniami, własne kolekcje i jasny motyw.
