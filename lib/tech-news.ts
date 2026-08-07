export interface NewsItem {
  title: string;
  link: string;
}

const FEED_URL = "https://techcrunch.com/category/artificial-intelligence/feed/";

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) return null;

  const raw = match[1].trim();
  const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities(cdataMatch ? cdataMatch[1] : raw);
}

/** Fetches the latest AI/tech headlines from TechCrunch's AI RSS feed. Returns [] on any failure. */
export async function getTechNews(limit = 4): Promise<NewsItem[]> {
  try {
    const response = await fetch(FEED_URL, { next: { revalidate: 1800 } });
    if (!response.ok) return [];

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    return items
      .slice(0, limit)
      .map((item) => {
        const title = extractTag(item, "title");
        const link = extractTag(item, "link");
        return title && link ? { title, link } : null;
      })
      .filter((item): item is NewsItem => item !== null);
  } catch {
    return [];
  }
}
