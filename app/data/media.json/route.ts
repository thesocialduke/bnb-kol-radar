import { extras, tierLabel, tierOf } from "@/lib/extras";

export const dynamic = "force-static";

export function GET() {
  const { fetchedAt, queries, articles } = extras.news;
  return Response.json({ fetched_at: fetchedAt, queries, articles: articles.map((a) => ({ ...a, outlet_group: tierLabel(tierOf(a.domain)) })) });
}
