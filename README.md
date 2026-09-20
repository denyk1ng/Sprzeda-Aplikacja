# Prospecting Copilot

Aplikacja do prospectingu, ktora ma zastapic reczny research i cold calle:
automatycznie znajduje wlasciwa osobe decyzyjna u klienta, sledzi co sie u
niego zmienia (rekrutacje, newsy, finansowanie) i generuje konkretna,
spersonalizowana propozycje kontaktu odwolujaca sie do tego sygnalu.

Inspirowana workflow z narzedzi Apollo, Snov.io i Clay, ale spiete w jedno,
proste narzedzie pod wlasny proces sprzedazowy.

## Jak to dziala

1. **Profil ICP** (`/icp`) - opisujesz raz: co sprzedajesz, jakie masz
   korzysci, jakie stanowiska/branze sa Twoim celem.
2. **Dodanie konta** (`/`) - wpisujesz domene firmy. Aplikacja:
   - pobiera dane o firmie (branza, wielkosc) - **Apollo Organization
     Enrichment**,
   - szuka osob na stanowiskach z Twojego ICP w nastepujacej kolejnosci
     (waterfall):
     1. **Apollo People Search** (wymaga platnego planu Apollo - na planie
        Free ten endpoint zwraca 403 `API_INACCESSIBLE`),
     2. jesli niedostepne: **wlasny skaner strony firmy** (`src/lib/discovery.ts`)
        - bez zadnego klucza API czyta publiczna podstrone "About/Team/
        Leadership" firmy i wyciaga realne imiona+stanowiska ze
        strukturalnych danych (schema.org `Person`) lub typowego ukladu
        kart zespolu,
     3. jesli i to nic nie znajdzie: przykladowe dane demo (wyraznie
        oznaczone w UI).
   - jesli znaleziony kontakt nie ma zweryfikowanego e-maila, dogrywa go
     przez **Snov.io** (Get emails from names + weryfikacja statusu) - to
     jest "waterfall" znany z Clay.
   - w UI kazdy kontakt ma etykiete zrodla (Apollo / strona firmy / demo),
     zeby od razu bylo widac, czy to prawdziwa osoba.
3. **Sledzenie sygnalow** (przycisk "Odswiez sygnaly" na karcie firmy) -
   sprawdza:
   - aktywne rekrutacje w firmie (**Apollo Job Postings**),
   - wzmianki w mediach o firmie (Google News RSS - bez klucza API),
   i klasyfikuje je (rekrutacja / finansowanie / zmiana w zarzadzie / news).
4. **Rekomendacja kontaktu** (przycisk "Zaproponuj kontakt" przy sygnale) -
   na podstawie ICP + wybranego sygnalu + najlepszego kontaktu generuje
   gotowa wiadomosc (angle + tresc) przez **Claude (Anthropic API)**. Bez
   klucza Anthropic aplikacja i tak dziala - uzywa deterministycznego
   szablonu.

Kazda integracja ma **tryb demo**: jesli nie skonfigurujesz danego klucza
API, modul zwraca sensowne, oznaczone dane demonstracyjne, zeby mozna bylo
przetestowac cala sciezke bez zadnych placonych kont.

## Weryfikacja hurtowa calej bazy klientow

- **Dodaj wiele firm naraz** ("Dodaj wiele firm naraz" na dashboardzie) -
  wklejasz liste domen (jedna na linie, max 30 na raz), aplikacja dodaje i
  wzbogaca je wszystkie po kolei tym samym waterfallem co przy dodawaniu
  pojedynczej firmy.
- **"Weryfikuj wszystko"** (przycisk na dashboardzie) - dla kazdego konta w
  bazie na nowo: odswieza dane firmy i kontakty, sprawdza nowe sygnaly i
  przelicza priorytet. Jeden klik zamiast recznego odswiezania kazdej
  firmy osobno.
- **Priorytet ("warto uderzac")** - kazda firma dostaje etykiete Wysoki /
  Sredni / Niski priorytet (`src/lib/priority.ts`), wyliczana z: typu i
  swiezosci wykrytego sygnalu (finansowanie > zmiana w zarzadzie >
  rekrutacja > wzmianka w mediach), jakosci najlepszego kontaktu (realny
  z Apollo/strony firmy vs demo) i dopasowania jego stanowiska do ICP.
  Prosta, czytelna regula - nie czarna skrzynka.
- **Recznik weryfikacja w KRS** (na stronie firmy) - wpisujesz numer KRS,
  aplikacja pobiera prawdziwe fakty rejestrowe (forma prawna, data
  rejestracji, NIP/REGON) z publicznego, bezplatnego API Ministerstwa
  Sprawiedliwosci i orientacyjnie oznacza likwidacje/upadlosc (wtedy
  priorytet automatycznie spada do "Niski"). **Nie da sie tego zrobic
  automatycznie po samej domenie** - oficjalna wyszukiwarka KRS po nazwie
  jest zablokowana botem-ochronnym (Incapsula) i nie ma publicznego API do
  wyszukiwania, tylko do odczytu po znanym numerze KRS. Sklad zarzadu w
  odpisie jest tez czesciowo zanonimizowany (RODO), wiec nie da sie z
  niego wyciagnac nazwisk jako kontaktow.

## Uruchomienie

```bash
npm install
cp .env.example .env.local   # uzupelnij klucze API, ktore posiadasz
npm run dev
```

Aplikacja wystartuje na `http://localhost:3000`.

## Konfiguracja kluczy API

| Zmienna | Do czego sluzy | Gdzie wziac |
| --- | --- | --- |
| `APOLLO_API_KEY` | Dane o firmie + wyszukiwanie osob decyzyjnych + job postings | developer.apollo.io -> Settings -> API |
| `SNOV_CLIENT_ID` / `SNOV_CLIENT_SECRET` | Domykanie e-maili, ktorych nie ma w Apollo | app.snov.io -> API Settings |
| `ANTHROPIC_API_KEY` | Generowanie tresci rekomendacji przez Claude | console.anthropic.com -> API Keys |

Bez zadnego klucza aplikacja dziala w pelnym trybie demo (dane oznaczone
jako `demo`/`[DEMO]`), co pozwala od razu zobaczyc caly przeplyw.

## Dane / trwaly zapis

Lokalnie (`npm run dev`) dane sa trzymane w pliku `data/db.json` (w
`.gitignore`, tworzony automatycznie) - zero setupu, dziala od razu.

**Na hostingu (Vercel, Railway itp.) plik na dysku nie wystarczy** - taki
serwer regularnie sie restartuje/usypia i przy kazdym restarcie plik
wraca do zera. Dlatego `src/lib/store.ts` automatycznie przelacza sie na
**Upstash Redis** (darmowy, trwaly, dziala z kazdym hostingiem), gdy w
zmiennych srodowiskowych ustawisz `UPSTASH_REDIS_REST_URL` i
`UPSTASH_REDIS_REST_TOKEN`. Caly stan aplikacji trzyma jako jeden obiekt
JSON pod jednym kluczem - prosto, ale wystarczajaco na skale
jednoosobowa/maloosobowa. Bez tych dwoch zmiennych aplikacja nadal dziala
lokalnie na pliku.

### Jak zalozyc darmowa baze Upstash (5 minut)

1. Wejdz na https://console.upstash.com i zaloz konto (np. przez GitHub).
2. Kliknij **Create Database**, wybierz dowolny region (najblizszy Twojemu
   hostingowi), typ **Regional**.
3. Wejdz w baze -> zakladka **REST API** -> skopiuj `UPSTASH_REDIS_REST_URL`
   i `UPSTASH_REDIS_REST_TOKEN`.
4. Wklej je do `.env.local` (lokalnie) lub do zmiennych srodowiskowych
   swojego hostingu (patrz nizej).

## Wdrozenie pod publiczny link (Vercel)

1. Zaloz darmowe konto na https://vercel.com (najlatwiej przez "Continue
   with GitHub").
2. **Add New -> Project** -> wybierz repozytorium `Sprzeda-Aplikacja` i
   branch z ta aplikacja. Vercel sam wykryje Next.js.
3. W sekcji **Environment Variables** dodaj (te, ktore posiadasz):
   `APOLLO_API_KEY`, `SNOV_CLIENT_ID`, `SNOV_CLIENT_SECRET`,
   `ANTHROPIC_API_KEY`, oraz **koniecznie** `UPSTASH_REDIS_REST_URL` i
   `UPSTASH_REDIS_REST_TOKEN` (patrz wyzej) - bez tych dwoch dane beda
   znikac przy kazdym redeployu.
4. Kliknij **Deploy**. Po chwili dostaniesz publiczny link
   `https://twoj-projekt.vercel.app`, dzialajacy zawsze, bez Twojego
   komputera.
5. Kazdy kolejny `git push` na ten branch automatycznie zrobi nowy deploy.

## Struktura kodu

```
src/
  lib/
    types.ts      - modele danych (Company, Contact, Signal, Recommendation, IcpProfile)
    store.ts       - magazyn danych: Upstash Redis (produkcja/hosting) albo plik JSON (lokalnie)
    apollo.ts       - integracja Apollo.io (org enrichment, people search, job postings)
    discovery.ts     - wlasny, bezplatny skaner strony firmy (fallback, gdy Apollo People Search jest niedostepny)
    contact-utils.ts - wspolne narzedzia do rankingu kontaktow (scoreTitle) i dane demo
    snov.ts         - integracja Snov.io (waterfall e-maili)
    news.ts         - darmowe zrodlo sygnalow (Google News RSS)
    signals.ts       - laczy Apollo job postings + news w liste sygnalow
    claude.ts        - generowanie rekomendacji kontaktu (Claude + fallback szablonowy)
    priority.ts       - wyliczanie priorytetu "warto uderzac" (Wysoki/Sredni/Niski)
    krs.ts            - bezplatne, bez klucza pobieranie faktow rejestrowych z KRS (recznie po numerze)
    enrich-company.ts  - wspolny helper (org enrichment + kontakty + e-maile) uzywany przez dodawanie pojedyncze, hurtowe i "weryfikuj wszystko"
  app/
    page.tsx                       - dashboard: lista kont + dodawanie firmy
    icp/page.tsx                    - konfiguracja profilu ICP / oferty
    companies/[id]/page.tsx          - szczegoly konta: kontakty, sygnaly, rekomendacje
    api/...                          - endpointy API dla powyzszych akcji
```

## Znane ograniczenia / dalsze kroki

- Magazyn danych (Redis/plik) trzyma caly stan jako jeden blob JSON bez
  blokad na wspolbiezne zapisy - w porzadku dla jednej/kilku osob
  klikajacych po kolei, przy realnym wieloosobowym uzyciu warto przejsc
  na baze relacyjna z osobnymi tabelami (np. Postgres/Prisma).
- Sledzenie sygnalow jest uruchamiane recznie (przycisk "Odswiez
  sygnaly"); naturalnym nastepnym krokiem jest cron/queue odswiezajacy
  sygnaly cyklicznie dla wszystkich kont i powiadamiajacy o nowych.
- Snov.io endpoints zaimplementowano wedlug oficjalnej dokumentacji API -
  warto zweryfikowac dokladne nazwy pol po pierwszym realnym wywolaniu z
  Twoim kontem (limity/format moga sie nieznacznie roznic miedzy planami).
- Wlasny skaner strony firmy (`discovery.ts`) dziala dobrze na typowych,
  serwerowo renderowanych stronach "About/Team" (WordPress, Webflow itp.).
  Na stronach mocno renderowanych po stronie klienta (ciezkie SPA) moze nie
  znalezc nikogo i wtedy aplikacja spada do danych demo - to celowe,
  bezpieczne zachowanie (nigdy nie pokazuje zgadywanych danych jako
  pewnych).
- Zaleznosc `next/node_modules/postcss` niesie ze soba znane, nisko-ryzykowne
  (w kontekscie tej aplikacji: brak next/image, custom serverow, i18n)
  advisory naprawione dopiero w Next 16 - do rozwazenia przy kolejnej
  migracji.
