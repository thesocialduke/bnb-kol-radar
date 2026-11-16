import type { Metadata } from "next";
import Link from "next/link";
import { snapshot } from "@/lib/db";
import { compact } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { Delta, LangTag, PageHead, Sparkline } from "@/components/bits";
import { StarButton } from "@/components/shortlist";
import cfg from "@/config/scoring.json";

export const metadata: Metadata = { title: "Rising" };

export default function Rising() {
  const { ranked, ts } = snapshot();
  const rising = ranked.filter((a) => a.is_rising).sort((a, b) => (b.growth_pctile ?? 0) - (a.growth_pctile ?? 0) || b.score! - a.score!);
  return (
    <>
      <PageHead
        title="Rising"
        sub={`Accounts under ${compact(cfg.rising.maxFollowers, 0)} followers whose growth momentum is in the top quartile of all tracked accounts and whose anomaly flag is low. These are the ones to approach before their rates climb.`}
      >
        <span className="num text-[12px] text-dim">{rising.length} accounts</span>
      </PageHead>

      {rising.length ? (
        <ul className="mt-4 panel bg-panel">
          {rising.map((a) => (
            <li key={a.handle} className="border-b border-line/70 bg-panel last:border-0">
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-3 py-3 md:grid-cols-[minmax(0,2.2fr)_auto_auto_auto_minmax(0,3fr)_auto]">
                <Link href={`/account/${a.handle}`} className="flex min-w-0 items-center gap-3">
                  <Avatar src={a.avatar} handle={a.handle} size={34} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{a.name ?? a.handle}</span>
                      <LangTag lang={a.lang} />
                    </span>
                    <span className="num block truncate text-[11.5px] text-dim">@{a.handle}<span className="mx-1.5 text-line">/</span>{compact(a.followers)} followers</span>
                  </span>
                </Link>
                <div className="md:order-last"><StarButton handle={a.handle} /></div>
                <div className="hidden md:block">
                  <Sparkline values={(ts.get(a.handle) ?? []).map((r) => r.followers ?? 0).filter((v) => v > 0)} />
                </div>
                <div className="hidden text-right md:block">
                  <div className="label !text-[10px]">Followers</div>
                  <Delta value={a.follower_growth_pct} />
                </div>
                <div className="hidden text-right md:block">
                  <div className="label !text-[10px]">Score</div>
                  <span className="num font-medium text-accent">{a.score!.toFixed(1)}</span>
                </div>
                <p className="col-span-2 text-[12.5px] text-mute md:col-span-1">
                  <span className="mr-2 inline-flex items-center gap-2 align-middle md:hidden">
                    <Sparkline values={(ts.get(a.handle) ?? []).map((r) => r.followers ?? 0).filter((v) => v > 0)} width={64} height={18} />
                    <span className="num text-accent">{a.score!.toFixed(1)}</span>
                  </span>
                  Flagged because {a.rising_reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-center text-mute">No account meets all three conditions in this snapshot.</p>
      )}
    </>
  );
}
