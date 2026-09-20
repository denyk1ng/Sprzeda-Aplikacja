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

## Dane

Dane sa trzymane lokalnie w `data/db.json` (plik ignorowany przez git,
tworzony automatycznie przy pierwszym uzyciu). To celowo prosty magazyn na
etap MVP - latwo podmienic na baze danych (np. Postgres/Prisma), gdy
narzedzie zacznie byc uzywane produkcyjnie / wieloosobowo.

## Struktura kodu

```
src/
  lib/
    types.ts      - modele danych (Company, Contact, Signal, Recommendation, IcpProfile)
    store.ts       - prosty magazyn JSON
    apollo.ts       - integracja Apollo.io (org enrichment, people search, job postings)
    discovery.ts     - wlasny, bezplatny skaner strony firmy (fallback, gdy Apollo People Search jest niedostepny)
    contact-utils.ts - wspolne narzedzia do rankingu kontaktow (scoreTitle) i dane demo
    snov.ts         - integracja Snov.io (waterfall e-maili)
    news.ts         - darmowe zrodlo sygnalow (Google News RSS)
    signals.ts       - laczy Apollo job postings + news w liste sygnalow
    claude.ts        - generowanie rekomendacji kontaktu (Claude + fallback szablonowy)
  app/
    page.tsx                       - dashboard: lista kont + dodawanie firmy
    icp/page.tsx                    - konfiguracja profilu ICP / oferty
    companies/[id]/page.tsx          - szczegoly konta: kontakty, sygnaly, rekomendacje
    api/...                          - endpointy API dla powyzszych akcji
```

## Znane ograniczenia / dalsze kroki

- Magazyn danych to plik JSON - wystarczajacy do pracy jednoosobowej,
  do skalowania wymaga migracji na baze danych.
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
