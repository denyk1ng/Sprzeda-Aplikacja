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

export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const DEMO_PEOPLE = [
  { first: "Anna", last: "Kowalska", title: "Head of Sales" },
  { first: "Marcin", last: "Nowak", title: "VP Sales" },
  { first: "Katarzyna", last: "Wisniewska", title: "Sales Director" },
  { first: "Piotr", last: "Zielinski", title: "CEO" },
  { first: "Tomasz", last: "Lewandowski", title: "Head of Growth" },
  { first: "Agnieszka", last: "Wojcik", title: "Revenue Operations Manager" },
];

/** Last-resort fallback when neither Apollo nor the website scraper find anyone. */
export function demoContacts(
  companyId: string,
  domain: string,
  targetTitles: string[]
): Contact[] {
  const seed = hashSeed(domain);
  const picked = [
    DEMO_PEOPLE[seed % DEMO_PEOPLE.length],
    DEMO_PEOPLE[(seed + 2) % DEMO_PEOPLE.length],
  ];
  const contacts: Contact[] = picked.map((p, i) => ({
    id: `contact_demo_${domain}_${i}`,
    companyId,
    firstName: p.first,
    lastName: p.last,
    title: p.title,
    linkedinUrl: `https://www.linkedin.com/in/${p.first.toLowerCase()}-${p.last.toLowerCase()}`,
    email: undefined,
    emailStatus: "unknown",
    emailSource: undefined,
    contactSource: "demo",
    apolloPersonId: undefined,
    titleMatchScore: scoreTitle(p.title, targetTitles),
    isPrimary: false,
  }));
  rankAndFlagPrimary(contacts);
  return contacts;
}
