import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const m4uLink = searchParams.get("url");
  const quality = searchParams.get("quality") || "";

  if (!m4uLink) return NextResponse.json({ status: false, error: "Missing URL" });

  try {
    const res = await fetch(`${PROXY_BASE}${m4uLink}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    let targetDiv: any = null;

    // Search for Quality Header
    $(".download-links-div h4").each((_, elem) => {
      const text = $(elem).text().trim();
      const searchTerms = quality.split(" ").filter(s => s.length > 2);
      
      // Match partial text (e.g. "720p HEVC")
      const isMatch = searchTerms.every(term => text.includes(term));
      if (isMatch) {
        targetDiv = $(elem).next(".downloads-btns-div");
      }
    });

    const links: any[] = [];
    if (targetDiv) {
      targetDiv.find("a").each((_: any, el: any) => {
        const href = $(el).attr("href");
        const text = $(el).text();
        
        if (href) {
            if (href.includes("hubcloud")) links.push({ server: "N-Cloud", url: href });
            else if (href.includes("gdflix")) links.push({ server: "V-Cloud", url: href });
        }
      });
    }

    return NextResponse.json({ status: true, data: links });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
