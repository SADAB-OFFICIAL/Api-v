import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) return NextResponse.json({ status: false, error: "Missing URL" });

  try {
    const res = await fetch(`${PROXY_BASE}${targetUrl}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();
    const poster = $(".post-thumbnail img").attr("src");
    const description = $("h3:contains('Storyline')").next("p").text().trim();

    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    $(".download-links-div h4").each((_, elem) => {
      const label = $(elem).text().trim();
      const linkDiv = $(elem).next(".downloads-btns-div");
      
      // Normal Links (Single Movie / Episode)
      const normalBtn = linkDiv.find("a.btn:not(.btn-zip)").attr("href");
      if (normalBtn) {
        episodeLinks.push({ label, url: normalBtn });
      }

      // Zip Links (Batch/Series)
      const zipBtn = linkDiv.find("a.btn-zip").attr("href");
      if (zipBtn) {
        batchLinks.push({ label, url: zipBtn });
      }
    });

    const isSeries = batchLinks.length > 0 || title.includes("Season");

    return NextResponse.json({
      status: true,
      data: {
        title,
        poster,
        description,
        isSeries,
        episodeLinks,
        batchLinks
      }
    });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
