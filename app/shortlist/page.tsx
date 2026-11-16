import type { Metadata } from "next";
import { snapshot, toRow } from "@/lib/db";
import { ShortlistView } from "@/components/ShortlistView";

export const metadata: Metadata = { title: "Campaign tracker" };

export default function ShortlistPage() {
  const { ranked, ts } = snapshot();
  return (
    <>
            <ShortlistView rows={ranked.map((a) => toRow(a, ts))} />
    </>
  );
}
