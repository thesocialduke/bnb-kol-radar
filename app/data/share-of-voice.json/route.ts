import { extras } from "@/lib/extras";

export const dynamic = "force-static";

export function GET() {
  return Response.json({ topics: extras.sov.map(({ series, ...r }) => ({ ...r, daily_engagements: series })) });
}
