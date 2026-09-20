/**
 * Free, key-less search for REAL companies in a specific Polish city/area,
 * e.g. Lublin - the thing the user explicitly asked for and the rebuild was
 * missing. Uses OpenStreetMap's Overpass API: crowd-sourced, but every
 * result is a real, mapped place (name + address, often phone/website),
 * never a generated placeholder. Honest limitations: coverage depends on
 * what's been mapped in OSM for that area, and there is no revenue/KRS data
 * attached - this only helps you FIND real companies to investigate, it does
 * not replace verifying them yourself.
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export interface GeoLead {
  name: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  category?: string;
  website?: string;
  phone?: string;
  osmId: string;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
}

function buildQuery(city: string, keyword?: string): string {
  const escapedCity = city.replace(/"/g, '\\"');
  // office=* is OSM's tag for company/business premises (IT, financial,
  // consulting, government, ...); craft=* covers trades/manufacturing.
  // Both are real "there is a business here" tags, unlike generic shop=*
  // which would pull in a lot of retail noise for a B2B search.
  return `
[out:json][timeout:25];
area["name"="${escapedCity}"]["boundary"="administrative"]->.a;
(
  node["office"](area.a);
  way["office"](area.a);
  node["craft"](area.a);
  way["craft"](area.a);
);
out center tags 80;
`.trim();
}

/** Searches OpenStreetMap for real, named businesses in the given Polish city. */
export async function findCompaniesInCity(
  city: string,
  keyword?: string
): Promise<GeoLead[] | null> {
  const query = buildQuery(city, keyword);
  const kw = keyword?.trim().toLowerCase();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "Mozilla/5.0 (compatible; ProspectingCopilot/0.1)",
        },
        body: query,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OverpassElement[] };
      const elements = data.elements ?? [];

      const seen = new Set<string>();
      const leads: GeoLead[] = [];
      for (const el of elements) {
        const tags = el.tags ?? {};
        const name = tags.name?.trim();
        if (!name) continue;
        if (kw) {
          const haystack = `${name} ${tags.office ?? ""} ${tags.craft ?? ""}`.toLowerCase();
          if (!haystack.includes(kw)) continue;
        }
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        leads.push({
          name,
          city: tags["addr:city"] ?? city,
          street: tags["addr:street"],
          houseNumber: tags["addr:housenumber"],
          category: tags.office ?? tags.craft,
          website: normalizeWebsite(tags.website ?? tags["contact:website"]),
          phone: tags.phone ?? tags["contact:phone"],
          osmId: `${el.type}/${el.id}`,
        });
      }
      return leads.slice(0, 60);
    } catch {
      // try the next mirror
    }
  }
  return null;
}

function normalizeWebsite(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
