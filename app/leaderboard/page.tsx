import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PageHead } from "@/components/bits";
import Link from "next/link";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Leaderboard() {
  const { ranked, ts } = snapshot();
  return (
    <>
      <PageHead
        title="Leaderboard"
        sub={
          <>
            {ranked.length} independent accounts ranked by KOL Quality Score. Sort any column, filter by language, audience size or anomaly flag.{" "}
            <Link href="/methodology" className="text-accent hover:underline">How the score works</Link>
          </>
        }
      />
      <LeaderboardTable rows={ranked.map((a) => toRow(a, ts))} />
    </>
  );
}
