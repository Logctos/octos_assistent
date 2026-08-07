import { supabase } from "@/lib/supabase";

export interface NewsItem {
  title: string;
  link: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tech-news`;

/** Fetches the latest AI/tech headlines via the tech-news Supabase Edge Function (sidesteps CORS on the raw RSS feed). Returns [] on any failure. */
export async function getTechNews(limit = 4): Promise<NewsItem[]> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return [];

    const response = await fetch(`${FUNCTION_URL}?limit=${limit}`, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { news?: NewsItem[] };
    return data.news ?? [];
  } catch {
    return [];
  }
}
