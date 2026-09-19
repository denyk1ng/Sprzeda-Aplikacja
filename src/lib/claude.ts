import type { Company, Contact, IcpProfile, Signal } from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export interface RecommendationDraft {
  angle: string;
  message: string;
  generatedBy: "claude" | "template";
}

function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Turns ICP + detected signal + primary contact into a concrete, personalized
 * outreach angle and message. Uses Claude when ANTHROPIC_API_KEY is set,
 * otherwise falls back to a deterministic template so the app still works
 * without any key configured.
 */
export async function generateRecommendation(
  icp: IcpProfile,
  company: Company,
  contact: Contact | undefined,
  signal: Signal | undefined
): Promise<RecommendationDraft> {
  if (!hasClaudeKey()) {
    return templateRecommendation(icp, company, contact, signal);
  }

  const prompt = buildPrompt(icp, company, contact, signal);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return templateRecommendation(icp, company, contact, signal);
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const { angle, message } = splitAngleAndMessage(text);
    if (!message) return templateRecommendation(icp, company, contact, signal);
    return { angle, message, generatedBy: "claude" };
  } catch {
    return templateRecommendation(icp, company, contact, signal);
  }
}

function buildPrompt(
  icp: IcpProfile,
  company: Company,
  contact: Contact | undefined,
  signal: Signal | undefined
): string {
  return `Jestes asystentem sprzedazy B2B. Na podstawie ponizszych danych napisz:
1) Linia "ANGLE:" - jedno zdanie po polsku wyjasniajace, dlaczego TERAZ jest dobry moment na kontakt z tym klientem.
2) Linia "MESSAGE:" - krotka, konkretna wiadomosc (email/LinkedIn, max 100 slow) po polsku, ktora:
   - odwoluje sie do konkretnego sygnalu/wydarzenia u klienta,
   - proponuje konkretne rozwiazanie oparte o nasz produkt,
   - konczy sie jednym prostym CTA (np. 15-minutowa rozmowa).
Nie dodawaj nic poza tymi dwiema liniami.

NASZA FIRMA: ${icp.companyName}
NASZ PRODUKT: ${icp.productDescription}
NASZE KORZYSCI: ${icp.valueProps.join("; ")}

KLIENT: ${company.name} (${company.domain}), branza: ${company.industry ?? "nieznana"}, pracownikow: ${company.employeeCount ?? "?"}
OSOBA KONTAKTOWA: ${contact ? `${contact.firstName} ${contact.lastName}, ${contact.title}` : "brak danych"}
WYKRYTY SYGNAL: ${signal ? `${signal.title} — ${signal.description}` : "brak konkretnego sygnalu, oprzyj sie na ogolnej sytuacji firmy"}`;
}

function splitAngleAndMessage(text: string): { angle: string; message: string } {
  const angleMatch = text.match(/ANGLE:\s*(.+)/i);
  const messageMatch = text.match(/MESSAGE:\s*([\s\S]+)/i);
  return {
    angle: angleMatch?.[1]?.trim() ?? "",
    message: messageMatch?.[1]?.trim() ?? text.trim(),
  };
}

function templateRecommendation(
  icp: IcpProfile,
  company: Company,
  contact: Contact | undefined,
  signal: Signal | undefined
): RecommendationDraft {
  const name = contact ? contact.firstName : "Tam";
  const valueProp = icp.valueProps[0] ?? icp.productDescription;

  if (signal) {
    const angle = `${company.name} pokazuje swiezy sygnal ("${signal.title}") - to naturalny pretekst do kontaktu zanim zrobi to konkurencja.`;
    const message =
      `Czesc ${name},\n\n` +
      `Zauwazylem(am), ze ${company.name} ${signalToClause(signal)}. ` +
      `W ${icp.companyName} pomagamy firmom w podobnej sytuacji: ${valueProp}.\n\n` +
      `Czy masz 15 minut w tym tygodniu, zeby pokazac, jak moglibysmy pomoc rowniez ${company.name}?`;
    return { angle, message, generatedBy: "template" };
  }

  const angle = `Brak swiezego sygnalu, ale ${company.name} pasuje do naszego ICP (${company.industry ?? "branza docelowa"}, ${company.employeeCount ?? "?"} os.) - warto otworzyc rozmowe na bazie dopasowania.`;
  const message =
    `Czesc ${name},\n\n` +
    `Widze, ze ${company.name} rozwija sie w obszarze, w ktorym ${icp.companyName} realnie pomaga: ${valueProp}.\n\n` +
    `Czy masz 15 minut w tym tygodniu na krotka rozmowe?`;
  return { angle, message, generatedBy: "template" };
}

function signalToClause(signal: Signal): string {
  switch (signal.type) {
    case "job_posting":
      return `aktywnie rekrutuje (${signal.title.replace("Nowa rekrutacja: ", "")}), co czesto oznacza rosnace potrzeby procesowe`;
    case "funding":
      return `pozyskala nowe finansowanie - to dobry moment na inwestycje we wzrost`;
    case "leadership_change":
      return `ma zmiany w zespole zarzadzajacym - nowe osoby czesto szukaja nowych narzedzi/dostawcow`;
    default:
      return `pojawila sie ostatnio w mediach ("${signal.title}")`;
  }
}
