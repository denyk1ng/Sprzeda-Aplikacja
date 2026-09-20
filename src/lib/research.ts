import Anthropic from "@anthropic-ai/sdk";
import type { Company, IcpProfile } from "./types";

function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ResearchResult {
  report: string;
  generatedAt: string;
}

/**
 * Deep, on-demand OSINT-style research on a company using Claude's built-in
 * web search tool (server-side - runs on Anthropic's infrastructure, no
 * extra API key needed beyond the Anthropic one already configured for
 * recommendations). Returns null when no ANTHROPIC_API_KEY is set or the
 * model never produced a usable report, so the caller can show a clear
 * "unavailable" state instead of a broken one.
 */
export async function researchCompany(
  company: Company,
  icp: IcpProfile
): Promise<ResearchResult | null> {
  if (!hasClaudeKey()) return null;

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_RESEARCH_MODEL || "claude-opus-5";

  const prompt = `Zbadaj w internecie firme "${company.name}" (domena: ${company.domain}${
    company.industry ? `, branza wg naszych danych: ${company.industry}` : ""
  }). Uzyj wyszukiwania, zeby znalezc aktualne, prawdziwe informacje - nie zgaduj.

Zbierz i zloz raport PO POLSKU w formacie markdown z sekcjami (uzyj dokladnie tych naglowkow "## "):

## Czym sie zajmuje
Krotki, konkretny opis dzialalnosci firmy.

## Skala i pozycja
Wielkosc (pracownicy/przychody jesli publiczne), pozycja rynkowa, glowni konkurenci jesli latwo ustalic.

## Ostatnie wydarzenia (ostatnie 6-12 miesiecy)
Finansowanie, zmiany w zarzadzie, nowe produkty, zwolnienia, ekspansja, przejecia, partnerstwa - cokolwiek istotnego. Jesli nic nie znalazles, napisz to wprost.

## Obecnosc medialna
Jak firma jest postrzegana publicznie - pozytywne/negatywne wzmianki, kontrowersje, nagrody.

## Dlaczego teraz warto sie odezwac
Na podstawie powyzszego i naszej oferty (${icp.productDescription}), 2-3 zdania: jaki jest najlepszy pretekst/moment do kontaktu.

## Zrodla
Lista adresow URL, z ktorych korzystales (jedna linia = jeden link).

Nie komentuj przebiegu wyszukiwania i nie pisz nic posredniego - odpowiedz WYLACZNIE finalnym raportem w powyzszym formacie.`;

  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 6 },
  ];

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  try {
    for (let iteration = 0; iteration < 6; iteration++) {
      const response = await client.messages.create({
        model,
        max_tokens: 12000,
        tools,
        messages,
      });

      if (response.stop_reason === "pause_turn") {
        messages = [...messages, { role: "assistant", content: response.content }];
        continue;
      }

      if (response.stop_reason === "refusal") return null;

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
        .trim();

      if (!text) return null;
      return { report: text, generatedAt: new Date().toISOString() };
    }
    return null;
  } catch {
    return null;
  }
}
