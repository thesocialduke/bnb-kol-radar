import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { PageHead } from "@/components/bits";
import { ShortlistView } from "@/components/ShortlistView";

export const metadata: Metadata = { title: "Campaign tracker" };

export default function ShortlistPage() {
  const { ranked, ts } = snapshot();
  return (
    <>
      <PageHead title="Campaign tracker" sub="Star any account to add it here. Record status, fee, deliverables and results; cost per engagement is worked out from what you enter. Everything is stored in this browser only and exports as CSV." />
      <ShortlistView rows={ranked.map((a) => toRow(a, ts))} />
    </>
  );
}
