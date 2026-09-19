export interface NewsItem {
  title: string;
  url: string;
  publishedAt?: string;
}

/**
 * Free signal source (no API key needed): Google News RSS search for the company name.
 * Used to catch funding rounds, leadership changes, product launches, etc.
 */
export async function fetchCompanyNews(companyName: string): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent(`"${companyName}"`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=pl&gl=PL&ceid=PL:pl`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectingCopilot/0.1)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml).slice(0, 5);
  } catch {
    return [];
  }
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemBlocks = xml.split("<item>").slice(1);
  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    if (title && link) {
      items.push({ title: decodeEntities(title), url: link, publishedAt: pubDate });
    }
  }
  return items;
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) return undefined;
  return match[1].replace("<![CDATA[", "").replace("]]>", "").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function classifyNewsSignal(title: string): "funding" | "leadership_change" | "news" {
  const t = title.toLowerCase();
  if (/(rundzie|finansowani|inwestycj|funding|raised|seed|series [a-d])/.test(t)) {
    return "funding";
  }
  if (/(nowym (ceo|dyrektorem)|new ceo|mianowa|appoint|awansow|dolacz(a|y)l)/.test(t)) {
    return "leadership_change";
  }
  return "news";
}
