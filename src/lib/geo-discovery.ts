/**
 * Free, key-less search for REAL companies in a specific Polish city/area,
 * e.g. Lublin - the thing the user explicitly asked for and the rebuild was
 * missing. Uses OpenStreetMap's Nominatim search API: crowd-sourced, but
 * every result is a real, mapped place (name + address, often phone/
 * website), never a generated placeholder.
 *
 * Note: the Overpass API (OSM's other query service) was tried first but
 * its public instance actively blocks/resets requests from cloud-hosted IPs
 * (confirmed from both this app's dev sandbox and its Vercel deployment) -
 * Nominatim's /search endpoint does not have that problem and, with
 * extratags=1, returns phone/website when OSM has them.
 *
 * Honest limitations: coverage depends on what's been mapped in OSM for
 * that area, and there is no revenue/KRS data attached - this only helps
 * you FIND real companies to investigate, it does not replace verifying
 * them yourself. Nominatim's usage policy caps this at ~1 request/second,
 * which one user click comfortably respects.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ProspectingCopilot/0.1 (prospecting-copilot-three.vercel.app)";

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

interface NominatimResult {
  osm_type: string;
  osm_id: number;
  type?: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
}

/** Searches OpenStreetMap (via Nominatim) for real, named businesses matching a keyword in the given Polish city. */
export async function findCompaniesInCity(
  city: string,
  keyword: string | undefined
): Promise<GeoLead[] | null> {
  const query = `${keyword?.trim() || "firma"} ${city}`;
  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "30",
    addressdetails: "1",
    extratags: "1",
    countrycodes: "pl",
  })}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pl" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];

    const seen = new Set<string>();
    const leads: GeoLead[] = [];
    for (const r of data) {
      const name = r.name?.trim() || r.extratags?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const addr = r.address ?? {};
      leads.push({
        name,
        city: addr.city ?? addr.town ?? addr.village ?? city,
        street: addr.road,
        houseNumber: addr.house_number,
        category: r.type,
        website: normalizeWebsite(r.extratags?.website),
        phone: r.extratags?.phone ?? r.extratags?.["contact:phone"],
        osmId: `${r.osm_type}/${r.osm_id}`,
      });
    }
    return leads;
  } catch {
    return null;
  }
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
