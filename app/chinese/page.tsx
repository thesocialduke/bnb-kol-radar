import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { median } from "@/lib/insights";
import { compact } from "@/lib/format";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { PageHead, Stat, StatGrid } from "@/components/bits";

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
      <PageHead
        title="中文 Chinese-language accounts"
        sub="Accounts whose BNB Chain posts are written mainly in Chinese, ranked on the same score as everyone else. Language is detected from the share of Han characters in each account's posts."
      />
      <section className="pt-5">
        <StatGrid>
          <Stat label="Accounts" value={zh.length} note={`of ${ranked.length} scored (${((zh.length / ranked.length) * 100).toFixed(0)}%)`} />
          <Stat label="BNB Chain engagement" value={compact(zhEng)} note={`${((zhEng / allEng) * 100).toFixed(1)}% of independent total`} />
          <Stat label="Median score" value={medScore != null ? medScore.toFixed(1) : "n/a"} note={medAll != null ? `${medAll.toFixed(1)} across all accounts` : undefined} />
          <Stat label="Rising" value={zh.filter((a) => a.is_rising).length} note="under 50K, top-quartile growth" />
        </StatGrid>
      </section>
      <LeaderboardTable rows={zh.map((a) => toRow(a, ts))} lockLang="zh" />
      <p className="mt-4 max-w-[80ch] panel bg-panel p-3 text-[12.5px] text-mute">
        <strong className="font-semibold text-ink">Coverage limit.</strong> This list comes from X only, through the BNB Chain topic. Chinese-language crypto audiences are also active on Binance Square, WeChat, Weibo and Telegram, none of which are measured here, so the real footprint of this market is larger than these numbers.
        {zhOfficial.length ? ` ${zhOfficial.length} Chinese-language official account${zhOfficial.length > 1 ? "s are" : " is"} listed under official voices and not ranked.` : ""}
      </p>
    </>
  );
}
