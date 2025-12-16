import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubUrl = searchParams.get("url");

  if (!hubUrl) return NextResponse.json({ status: false, error: "Missing URL" });

  try {
    // HOP 1: Fetch HubCloud Page
    const res1 = await fetch(`${PROXY_BASE}${hubUrl}`, { cache: "no-store" });
    const html1 = await res1.text();
    const $1 = cheerio.load(html1);

    // Get GamerXYT Link (First Hop)
    let gamerLink = $1("a#download").attr("href");
    
    // Fallback: If ID not found, search by class/text
    if (!gamerLink) {
        $1("a.btn").each((_, el) => {
            if ($1(el).text().includes("Generate Direct Download Link")) {
                gamerLink = $1(el).attr("href");
            }
        });
    }

    if (!gamerLink) return NextResponse.json({ status: false, error: "Gamer Link Not Found" });

    // HOP 2: Fetch GamerXYT Page
    const res2 = await fetch(`${PROXY_BASE}${gamerLink}`, { cache: "no-store" });
    const html2 = await res2.text();
    const $2 = cheerio.load(html2);

    // Extract Final Links (Second Hop)
    const finalLinks: any[] = [];
    $2("a.btn").each((_, el) => {
        const text = $2(el).text().trim().toLowerCase();
        const href = $2(el).attr("href");

        if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
            if (text.includes("fslv2")) finalLinks.push({ server: "FSLv2", link: href });
            else if (text.includes("fsl")) finalLinks.push({ server: "FSL", link: href });
            else if (text.includes("pixel") || href.includes("pixeldrain")) finalLinks.push({ server: "Pixel", link: href });
            else if (text.includes("zipdisk")) finalLinks.push({ server: "ZipDisk", link: href });
        }
    });

    return NextResponse.json({ status: true, data: finalLinks });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
