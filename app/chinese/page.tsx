import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { median } from "@/lib/insights";
import { compact } from "@/lib/format";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Stat, StatGrid } from "@/components/bits";

export const metadata: Metadata = { title: "Chinese-language accounts" };

export default function Chinese() {
  const { ranked, officials, ts } = snapshot();
  const zh = ranked.filter((a) => a.lang === "zh");
  const allEng = ranked.reduce((s, a) => s + a.bnb_engagements, 0);
  const zhEng = zh.reduce((s, a) => s + a.bnb_engagements, 0);
  const medScore = median(zh.map((a) => a.score!));
  const medAll = median(ranked.map((a) => a.score!));
  const zhOfficial = officials.filter((a) => a.lang === "zh");
  return (
    <>
            <section className="pt-5">
        <StatGrid>
          <Stat label="Accounts" value={zh.length} />
          <Stat label="BNB Chain engagement" value={compact(zhEng)} />
          <Stat label="Median score" value={medScore != null ? medScore.toFixed(1) : "n/a"} />
          <Stat label="Rising" value={zh.filter((a) => a.is_rising).length} />
        </StatGrid>
      </section>
      <LeaderboardTable rows={zh.map((a) => toRow(a, ts))} lockLang="zh" />
    </>
  );
}
