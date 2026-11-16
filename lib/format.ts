export function compact(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e4) return (n / 1e3).toFixed(digits) + "K";
  return Math.round(n).toLocaleString("en-US");
}

export function full(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  return Math.round(n).toLocaleString("en-US");
}

export function pct(n: number | null | undefined, digits = 1, signed = true): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  const s = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : n.toFixed(digits);
  return (signed && n > 0 ? "+" : "") + s + "%";
}

export function score(n: number | null | undefined): string {
  if (n == null) return "n/a";
  return n.toFixed(1);
}

export const LANG_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese",
  vi: "Vietnamese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  es: "Spanish",
  pt: "Portuguese",
  tr: "Turkish",
  id: "Indonesian",
  fr: "French",
  de: "German",
  ar: "Arabic",
  th: "Thai",
  hi: "Hindi",
  unknown: "Unknown",
};

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code.toUpperCase();
}

export function shortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function longDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
