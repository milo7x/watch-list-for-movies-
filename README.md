# Aftercredits — Movie Watchlist

[English](#english) · [Polski](#polski)

## English

A personal movie watchlist made with HTML, CSS and JavaScript.

### Start

1. Keep `index.html`, `style.css`, `script.js` and `movies.js` in the same folder.
2. Open `index.html` in your browser. You can also open the folder in Visual Studio Code and use Live Server.
3. No installation, account, API key or database is needed.

If you used the previous version, replace the files in the same folder and use the same browser and address. Your watchlist uses the same saved-data key. Opening a different file location or a different Live Server address can use separate browser storage.

### Add a movie

- Click **Add movie** at the top.
- Type at least two letters of a title. Up to five suggestions appear from the two collections.
- Click a suggestion, or use the arrow keys and Enter. The title, year, genre and image are filled in.
- Click **Add movie** to save it. Selecting a suggestion alone does not save it.
- You can also enter any film manually. Only the title is required.
- Tick **I've already watched this** if you have seen the film.

Suggestions also search available alternative titles. Polish letters work with or without accents: for example, `dlug` can find `Dług`.

### Explore the collections

Click **Top movies** and choose **IMDb Top 100** or **100 Polish Films**. Each collection contains 100 entries, displayed on five pages of 20. Search checks the entire selected collection, including films on other pages.

Click **Add to watchlist** on any card. Films already added are marked, and the same identified film cannot be added twice. Click **My watchlist** to return, or **Add movie** to return and open the form.

These are saved ranking snapshots, not live popularity charts:

- **International:** the first 100 places in the IMDb Top 250 order recorded by German Wikipedia on **22 July 2026**. IMDb scores are a separate snapshot retrieved through Cinemeta on **10 September 2026**. An unavailable score is omitted.
- **Polish:** 100 titles selected in order from Filmweb's Polish ranking retrieved on **10 September 2026**. Entries labelled documentary or short film and the numbered Dekalog episodes are excluded. Titles without a verified image are also excluded. Some television films, other TV titles and international co-productions remain. The displayed numbers are positions in this selection, not the original unfiltered Filmweb positions. Scores are clearly labelled **Filmweb**, not IMDb.

Filmweb sometimes lists the production year while IMDb lists a later release year. The catalogue retains available alternative years for duplicate checks.

### Track and rate

- Click **Mark watched** when you finish a movie.
- Choose one to five stars to give your own rating. Click the selected rating again to clear it.
- Your stars are separate from the public scores shown out of ten.
- **Watch again** moves the film back to Want to watch and clears your personal rating.
- Use the search box and All movies / Want to watch / Watched filters.
- Click **×** to delete a film. **Undo** restores the most recently deleted film for ten seconds.
- The average includes only watched films that you personally rated.

### Saving and images

The watchlist is saved in this browser using `localStorage`. It remains after refreshing, but it does not sync between devices. Clearing site data removes it. The footer warns you if saving is unavailable.

Catalogue text and suggestions work without an internet connection. Remote images need internet access. All 200 catalogue entries have verified IMDb image URLs. Some older or television titles use an IMDb still instead of a theatrical poster. If an image is missing or cannot load, the card displays its title instead.

### Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, navigation and movie form |
| `style.css` | Original dark design, rankings and suggestions |
| `script.js` | Adding, rating, saving, search, navigation and duplicate checks |
| `movies.js` | Both 100-film collections and source information |
| `README.md` | This guide in English and Polish |

To update a collection, edit its records in `movies.js`. Keep `rank`, title, year, identifiers, image URL and source details accurate. Load `movies.js` before `script.js` in the HTML. The browser does not fetch ranking data or automatically update scores.

## Polski

Osobista lista filmów do obejrzenia, napisana w HTML, CSS i JavaScript.

### Uruchomienie

1. Umieść `index.html`, `style.css`, `script.js` i `movies.js` w jednym folderze.
2. Otwórz `index.html` w przeglądarce. Możesz też otworzyć folder w Visual Studio Code i użyć Live Server.
3. Nie potrzebujesz instalacji, konta, klucza API ani bazy danych.

Jeśli korzystasz ze starszej wersji, podmień pliki w tym samym folderze i używaj tej samej przeglądarki oraz adresu. Klucz zapisanych danych pozostaje ten sam. Inna lokalizacja pliku lub inny adres Live Server może korzystać z osobnego zapisu.

### Dodawanie filmu

- Kliknij **Add movie** u góry strony.
- Wpisz co najmniej dwie litery tytułu. Pojawi się do pięciu podpowiedzi z obu kolekcji.
- Kliknij podpowiedź albo wybierz ją strzałkami i naciśnij Enter. Tytuł, rok, gatunek i obraz zostaną uzupełnione.
- Kliknij **Add movie**, aby zapisać film. Sam wybór podpowiedzi jeszcze go nie zapisuje.
- Możesz też dodać dowolny film ręcznie. Wymagany jest tylko tytuł.
- Zaznacz **I've already watched this**, jeśli film jest już obejrzany.

Podpowiedzi uwzględniają dostępne alternatywne tytuły. Nie musisz wpisywać polskich znaków: na przykład `dlug` znajdzie `Dług`.

### Przeglądanie kolekcji

Kliknij **Top movies** i wybierz **IMDb Top 100** albo **100 Polish Films**. Każda kolekcja zawiera 100 pozycji na pięciu stronach po 20. Wyszukiwanie obejmuje całą wybraną kolekcję, również inne strony.

Przycisk **Add to watchlist** dodaje film do Twojej listy. Dodane filmy są oznaczone, a rozpoznanego filmu nie można dodać drugi raz. **My watchlist** wraca do listy. **Add movie** wraca do listy i otwiera formularz.

To zapisane zestawienia, a nie rankingi popularności aktualizowane na żywo:

- **Kolekcja międzynarodowa:** pierwsze 100 miejsc IMDb Top 250 według zestawienia w niemieckiej Wikipedii z **22 lipca 2026 r.** Oceny IMDb pobrano osobno przez Cinemeta **10 września 2026 r.** Brakująca ocena nie jest wyświetlana.
- **Kolekcja polska:** 100 tytułów wybranych w kolejności z polskiego rankingu Filmwebu pobranego **10 września 2026 r.** Pominięto pozycje oznaczone jako dokumentalne lub krótkometrażowe oraz numerowane odcinki Dekalogu. Pominięto też pozycje bez zweryfikowanego obrazu. Pozostają niektóre filmy i inne tytuły telewizyjne oraz koprodukcje międzynarodowe. Numery oznaczają miejsce w tej kolekcji, a nie w pełnym rankingu Filmwebu. Oceny mają oznaczenie **Filmweb**, nie IMDb.

Filmweb czasem podaje rok produkcji, a IMDb późniejszy rok premiery. Dostępne alternatywne lata pomagają wykrywać duplikaty.

### Oglądanie i ocenianie

- Kliknij **Mark watched**, gdy obejrzysz film.
- Wybierz od jednej do pięciu gwiazdek. Ponowne kliknięcie wybranej oceny usuwa ją.
- Twoje gwiazdki są oddzielone od publicznych ocen w skali do dziesięciu.
- **Watch again** przenosi film do planowanych i usuwa Twoją ocenę.
- Korzystaj z wyszukiwarki oraz filtrów All movies / Want to watch / Watched.
- **×** usuwa film. Przycisk **Undo** przez dziesięć sekund przywraca ostatnio usunięty film.
- Średnia obejmuje tylko obejrzane filmy, które oceniasz własnymi gwiazdkami.

### Zapis i obrazy

Lista zapisuje się w tej przeglądarce przez `localStorage`. Odświeżenie jej nie usuwa, ale dane nie synchronizują się między urządzeniami. Wyczyszczenie danych strony usuwa listę. Stopka informuje, gdy zapis nie jest dostępny.

Tekst kolekcji i podpowiedzi działają bez internetu. Zdalne obrazy wymagają połączenia. Wszystkie 200 pozycji ma zweryfikowany adres obrazu IMDb. Niektóre starsze lub telewizyjne tytuły używają kadru z IMDb zamiast plakatu kinowego. Jeśli obraz nie istnieje lub nie może się załadować, karta pokazuje tytuł filmu.

### Pliki

| Plik | Zastosowanie |
| --- | --- |
| `index.html` | Układ strony, nawigacja i formularz |
| `style.css` | Ciemny wygląd, rankingi i podpowiedzi |
| `script.js` | Dodawanie, oceny, zapis, wyszukiwanie i sprawdzanie duplikatów |
| `movies.js` | Dwie kolekcje po 100 filmów i informacje o źródłach |
| `README.md` | Instrukcja po angielsku i po polsku |

Aby zaktualizować kolekcję, edytuj rekordy w `movies.js`. Zachowaj poprawne numery, tytuły, lata, identyfikatory, adresy obrazów i źródła. W HTML plik `movies.js` musi być przed `script.js`. Przeglądarka nie pobiera nowych rankingów ani nie aktualizuje ocen automatycznie.

## Sources / Źródła

- [IMDb Top 250](https://www.imdb.com/chart/top/)
- [Ranking order reference: Wikipedia, 22 July 2026 snapshot](https://de.wikipedia.org/wiki/IMDb_Top_250_Movies)
- [Filmweb Polish ranking](https://www.filmweb.pl/ranking/film/country/42)
- [Cinemeta](https://github.com/Stremio/cinemeta): provider of the retrieved IMDb scores.
- [theapache64/top250](https://github.com/theapache64/top250): archived IMDb title identifiers and image URLs; its old scores are not used.
- IMDb's public suggestion metadata supplied additional verified title identities and images. Individual film and image source details are included in `movies.js`.
