import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy2.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubUrl = searchParams.get("url");

  if (!hubUrl) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  try {
    // 1. HubCloud Fetch
    const res1 = await fetch(`${PROXY_BASE}${hubUrl}`, { cache: "no-store" });
    const html1 = await res1.text();
    const $1 = cheerio.load(html1);

    let gamerLink = $1("a#download").attr("href");
    if (!gamerLink) {
        // Fallback search
        $1("a.btn").each((_, el) => {
            if ($1(el).text().includes("Generate Direct Download Link")) {
                gamerLink = $1(el).attr("href");
            }
        });
    }

    if (!gamerLink) throw new Error("Gamer Link Not Found");

    // 2. GamerXYT Fetch
    const res2 = await fetch(`${PROXY_BASE}${gamerLink}`, { cache: "no-store" });
    const html2 = await res2.text();
    const $2 = cheerio.load(html2);

    const finalLinks: any[] = [];
    $2("a.btn").each((_, el) => {
        const text = $2(el).text().trim().toLowerCase();
        const href = $2(el).attr("href");

        if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
            let type = "unknown";
            if (text.includes("fsl")) type = "FSL";
            else if (text.includes("pixel") || href.includes("pixeldrain")) type = "Pixel";
            else if (text.includes("zipdisk")) type = "ZipDisk";
            else if (text.includes("10gbps")) type = "Fast-Server";
            
            if(type !== "unknown") {
                finalLinks.push({ name: $2(el).text().trim(), url: href, type });
            }
        }
    });

    return NextResponse.json({ servers: finalLinks });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
