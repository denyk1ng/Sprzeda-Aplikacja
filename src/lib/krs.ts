const KRS_BASE = "https://api-krs.ms.gov.pl/api/krs";

export interface KrsFacts {
  legalForm?: string;
  registeredAt?: string;
  nip?: string;
  regon?: string;
  legalFlag?: "w_likwidacji" | "upadlosc";
}

/**
 * Free, key-less lookup against the Ministry of Justice's public KRS
 * "Odpis Aktualny" API - but only by KRS number, since the official
 * name-search UI is behind bot protection and has no public API. Board
 * member names in the odpis are privacy-redacted (RODO), so this only
 * pulls hard legal/registration facts, never contacts.
 *
 * The liquidation/bankruptcy flag is best-effort (we look for the
 * relevant sections in dzial6) and should be treated as orientacyjny -
 * always cross-check the full odpis for anything decision-critical.
 */
export async function fetchKrsFacts(
  krsNumber: string
): Promise<KrsFacts | null> {
  const digits = krsNumber.replace(/\D/g, "").padStart(10, "0");
  try {
    const res = await fetch(
      `${KRS_BASE}/OdpisAktualny/${digits}?rejestr=P&format=json`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const dane = data?.odpis?.dane;
    if (!dane) return null;

    const podmiot = dane.dzial1?.danePodmiotu;
    const naglowek = data.odpis.naglowekA;
    const dzial6 = dane.dzial6 ?? {};

    let legalFlag: KrsFacts["legalFlag"] | undefined;
    if (isNonEmpty(dzial6.postepowanieUpadlosciowe)) legalFlag = "upadlosc";
    else if (isNonEmpty(dzial6.likwidacja)) legalFlag = "w_likwidacji";

    return {
      legalForm: podmiot?.formaPrawna,
      registeredAt: naglowek?.dataRejestracjiWKRS,
      nip: podmiot?.identyfikatory?.nip,
      regon: podmiot?.identyfikatory?.regon,
      legalFlag,
    };
  } catch {
    return null;
  }
}

function isNonEmpty(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}
