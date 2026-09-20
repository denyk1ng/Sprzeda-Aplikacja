import type { Company, Contact, IcpProfile, Priority, Signal, SignalType } from "./types";

const SIGNAL_WEIGHT: Record<SignalType, number> = {
  funding: 3,
  leadership_change: 2.5,
  job_posting: 1.5,
  news: 0.5,
  manual: 1,
};

const CONTACT_SOURCE_WEIGHT: Record<string, number> = {
  apollo: 1,
  manual: 0.9,
  website: 0.7,
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
/** Does the company's known size fall inside the ICP's employee-count filter (if any)? */
function fitsEmployeeFilter(company: Company, icp: IcpProfile): boolean | null {
  if (icp.minEmployees == null && icp.maxEmployees == null) return null;
  if (company.employeeCount == null) return null;
  if (icp.minEmployees != null && company.employeeCount < icp.minEmployees) return false;
  if (icp.maxEmployees != null && company.employeeCount > icp.maxEmployees) return false;
  return true;
}

function fitsCityFilter(company: Company, icp: IcpProfile): boolean | null {
  if (icp.cities.length === 0) return null;
  if (!company.city) return null;
  return icp.cities.some((c) => c.toLowerCase() === company.city!.toLowerCase());
}

export function computePriority(
  company: Company,
  contacts: Contact[],
  signals: Signal[],
  icp: IcpProfile
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
    ? CONTACT_SOURCE_WEIGHT[primaryContact.contactSource ?? ""] ?? 0
    : 0;
  const titleScore = primaryContact ? primaryContact.titleMatchScore / 100 : 0;

  const employeeFit = fitsEmployeeFilter(company, icp);
  const cityFit = fitsCityFilter(company, icp);
  const fitScore = (employeeFit === true ? 0.5 : employeeFit === false ? -0.5 : 0) +
    (cityFit === true ? 0.5 : cityFit === false ? -0.5 : 0);

  const total = signalScore + contactSourceScore + titleScore + fitScore;

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
        : "dodany recznie";
    reasonParts.push(
      `kontakt: ${primaryContact.title} (${sourceLabel}, dopasowanie ${primaryContact.titleMatchScore}%)`
    );
  } else {
    reasonParts.push("brak znalezionego kontaktu");
  }
  if (employeeFit === false || cityFit === false) {
    reasonParts.push("poza filtrem ICP (wielkosc/miasto)");
  } else if (employeeFit === true || cityFit === true) {
    reasonParts.push("pasuje do filtra ICP (wielkosc/miasto)");
  }

  return { level, reason: reasonParts.join("; ") };
}
