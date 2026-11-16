import Link from "next/link";
import { compact } from "@/lib/format";

type Item = { handle: string; name: string | null; value: number; share: number };
type Rect = Item & { x: number; y: number; w: number; h: number };

// Squarified treemap (Bruls, Huizing, van Wijk) on a 100 x 100 canvas.
function squarify(items: Item[], W: number, H: number): Rect[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  const scaled = items.map((i) => ({ item: i, area: (i.value / total) * W * H }));
  const out: Rect[] = [];
  let x = 0, y = 0, w = W, h = H;
  let row: typeof scaled = [];
  const worst = (r: typeof scaled, side: number) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    const max = Math.max(...r.map((b) => b.area));
    const min = Math.min(...r.map((b) => b.area));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const layout = (r: typeof scaled) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    if (w >= h) {
      const rw = s / h;
      let cy = y;
      for (const b of r) {
        const bh = b.area / rw;
        out.push({ ...b.item, x, y: cy, w: rw, h: bh });
        cy += bh;
      }
      x += rw;
      w -= rw;
    } else {
      const rh = s / w;
      let cx = x;
      for (const b of r) {
        const bw = b.area / rh;
        out.push({ ...b.item, x: cx, y, w: bw, h: rh });
        cx += bw;
      }
      y += rh;
      h -= rh;
    }
  };
  for (const b of scaled) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, b], side) <= worst(row, side)) row.push(b);
    else {
      layout(row);
      row = [b];
    }
  }
  if (row.length) layout(row);
  return out;
}

export function Treemap({ items }: { items: Item[] }) {
  const rects = squarify(items, 100, 100);
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-bg sm:aspect-[16/9] lg:aspect-[21/9]">
      {rects.map((r) => {
        const t = Math.sqrt(r.value / max);
        const big = r.w > 9 && r.h > 12;
        const mid = r.w > 5.5 && r.h > 7;
        return (
          <Link
            key={r.handle}
            href={`/account/${r.handle}`}
            title={`@${r.handle}: ${r.share.toFixed(2)}% of tracked BNB Chain engagement (${compact(r.value)})`}
            className="group absolute overflow-hidden border border-bg p-1.5 hover:brightness-125 focus-visible:z-10"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: `${r.h}%`,
              background: `color-mix(in oklab, var(--color-accent) ${Math.round(10 + t * 78)}%, var(--color-panel))`,
              color: t > 0.5 ? "#17130a" : "var(--color-ink)",
            }}
          >
            {mid ? (
              <>
                <span className={`block truncate font-medium leading-tight ${big ? "text-[13px]" : "text-[11px]"}`}>@{r.handle}</span>
                <span className={`num block leading-tight opacity-80 ${big ? "text-[12px]" : "text-[10px]"}`}>{r.share.toFixed(1)}%</span>
              </>
            ) : (
              <span className="sr-only">@{r.handle} {r.share.toFixed(2)}%</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
