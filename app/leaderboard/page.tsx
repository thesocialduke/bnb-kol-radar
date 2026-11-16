import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import Link from "next/link";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Leaderboard() {
  const { ranked, ts } = snapshot();
  return (
    <>
            <LeaderboardTable rows={ranked.map((a) => toRow(a, ts))} />
    </>
  );
}
