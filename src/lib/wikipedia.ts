export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls: {
    desktop: {
      page: string;
    };
  };
}

export async function fetchWikiSummary(name: string, lang: 'tr' | 'en'): Promise<WikiSummary | null> {
  try {
    const slug = name.replace(/ /g, '_');
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`, {
      headers: {
        'User-Agent': 'StarTwinApp/1.0',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return null; // Not found or error
    }

    const data = await res.json();
    
    // Sometimes wikipedia returns a disambiguation page (type: 'disambiguation'). We only want real articles.
    if (data.type === 'disambiguation' || !data.extract) {
      return null;
    }

    return data as WikiSummary;
  } catch (e) {
    console.error(`Wikipedia fetch failed for ${name}:`, e);
    return null;
  }
}
