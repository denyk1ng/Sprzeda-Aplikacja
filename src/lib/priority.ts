import type { Company, Contact, Priority, Signal, SignalType } from "./types";

const SIGNAL_WEIGHT: Record<SignalType, number> = {
  funding: 3,
  leadership_change: 2.5,
  job_posting: 1.5,
  news: 0.5,
  manual: 1,
};

const CONTACT_SOURCE_WEIGHT: Record<string, number> = {
  apollo: 1,
  website: 0.7,
  demo: 0,
};

const SIGNAL_LABEL: Record<SignalType, string> = {
  job_posting: "aktywna rekrutacja",
  news: "wzmianka w mediach",
  funding: "nowe finansowanie",
  leadership_change: "zmiana w zarzadzie",
  manual: "recznie dodany sygnal",
};

export interface PriorityResult {
  level: Priority;
  reason: string;
}

/**
 * Simple, transparent rule-based "worth reaching out now" score - combines
 * how strong/fresh the detected signal is with how good the primary
 * contact match is. A KRS legal-risk flag (liquidation/bankruptcy) always
 * overrides everything else to "low".
 */
export function computePriority(
  company: Company,
  contacts: Contact[],
  signals: Signal[]
): PriorityResult {
  if (company.krsLegalFlag) {
    const label =
      company.krsLegalFlag === "upadlosc" ? "upadlosci" : "likwidacji";
    return {
      level: "low",
      reason: `Wedlug KRS firma jest w stanie ${label} - odradzamy kontakt sprzedazowy.`,
    };
  }

  const topSignal = [...signals].sort(
    (a, b) => SIGNAL_WEIGHT[b.type] - SIGNAL_WEIGHT[a.type]
  )[0];
  const signalScore = topSignal ? SIGNAL_WEIGHT[topSignal.type] : 0;

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const contactSourceScore = primaryContact
    ? CONTACT_SOURCE_WEIGHT[primaryContact.contactSource ?? "demo"] ?? 0
    : 0;
  const titleScore = primaryContact ? primaryContact.titleMatchScore / 100 : 0;

  const total = signalScore + contactSourceScore + titleScore;

  const level: Priority = total >= 3 ? "high" : total >= 1.3 ? "medium" : "low";

  const reasonParts: string[] = [];
  if (topSignal) {
    reasonParts.push(`sygnal: ${SIGNAL_LABEL[topSignal.type]} ("${topSignal.title}")`);
  } else {
    reasonParts.push("brak wykrytych sygnalow");
  }
  if (primaryContact) {
    const sourceLabel =
      primaryContact.contactSource === "apollo"
        ? "Apollo"
        : primaryContact.contactSource === "website"
        ? "strona firmy"
        : "demo";
    reasonParts.push(
      `kontakt: ${primaryContact.title} (${sourceLabel}, dopasowanie ${primaryContact.titleMatchScore}%)`
    );
  } else {
    reasonParts.push("brak znalezionego kontaktu");
  }

  return { level, reason: reasonParts.join("; ") };
}
