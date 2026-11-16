import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const metadata: Metadata = { title: "Findings" };

export default function Findings() {
  const file = path.join(process.cwd(), "content", "findings.md");
  const md = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const html = marked.parse(md, { async: false }) as string;
  return (
    <>
            {md ? <div className="prose-kr" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="py-10 text-center text-mute">No findings written yet.</p>}
    </>
  );
}
