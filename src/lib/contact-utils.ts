import type { Contact } from "./types";

export function scoreTitle(title: string, targetTitles: string[]): number {
  const t = title.trim().toLowerCase();
  if (!t) return 0;
  let best = 0;
  for (const target of targetTitles) {
    const tt = target.toLowerCase();
    if (t === tt) best = Math.max(best, 100);
    else if (t.includes(tt) || tt.includes(t)) best = Math.max(best, 70);
    else {
      const words = tt.split(/\s+/);
      const hits = words.filter((w) => t.includes(w)).length;
      if (hits > 0) best = Math.max(best, Math.round((hits / words.length) * 50));
    }
  }
  return best;
}

export function rankAndFlagPrimary(contacts: Contact[]) {
  contacts.sort((a, b) => b.titleMatchScore - a.titleMatchScore);
  contacts.forEach((c, i) => (c.isPrimary = i === 0));
}

/**
 * Manually entered contact - the user found this person themselves (e.g. on
 * LinkedIn) and typed in what they know. This is the honest fallback when
 * neither Apollo nor the website scraper finds anyone: we show "brak
 * zweryfikowanego kontaktu" and let the user add one, rather than making one up.
 */
export function manualContact(
  companyId: string,
  targetTitles: string[],
  input: {
    firstName: string;
    lastName: string;
    title: string;
    phone?: string;
    email?: string;
    linkedinUrl?: string;
  }
): Contact {
  return {
    id: `contact_manual_${companyId}_${Date.now().toString(36)}`,
    companyId,
    firstName: input.firstName,
    lastName: input.lastName,
    title: input.title,
    phone: input.phone,
    linkedinUrl: input.linkedinUrl,
    email: input.email,
    emailStatus: input.email ? "verified" : "unknown",
    emailSource: undefined,
    contactSource: "manual",
    apolloPersonId: undefined,
    titleMatchScore: scoreTitle(input.title, targetTitles),
    isPrimary: false,
  };
}
