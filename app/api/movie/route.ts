import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "Missing Slug" }, { status: 400 });

  try {
    const decoded = atob(slug);
    const [path, baseUrl] = decoded.split("|||");
    const targetUrl = `${baseUrl}/${path}/`;

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
      
      const resMatch = label.match(/(\d{3,4}p)/);
      const res = resMatch ? resMatch[0] : "HD";
      const isHEVC = label.toLowerCase().includes("hevc");
      
      // Normal Links
      const normalBtn = linkDiv.find("a.btn:not(.btn-zip)").attr("href");
      if (normalBtn) {
         const sizeMatch = label.match(/\[(\d+(\.\d+)?[GM]B)(\/E)?\]/);
         episodeLinks.push({ 
             label, res, isHEVC, 
             size: sizeMatch ? sizeMatch[1] : "N/A",
             url: normalBtn 
         });
      }

      // Zip Links
      const zipBtn = linkDiv.find("a.btn-zip").attr("href");
      if (zipBtn) {
         const zipText = linkDiv.find("a.btn-zip").text();
         const sizeMatch = zipText.match(/\[(\d+(\.\d+)?[GM]B)\]/);
         batchLinks.push({ 
             label: label.replace("Episode", "Season"), res, isHEVC,
             size: sizeMatch ? sizeMatch[1] : "Zip",
             url: zipBtn 
         });
      }
    });

    const isSeries = batchLinks.length > 0 || title.includes("Season");

    return NextResponse.json({
        title, poster, description, isSeries, episodeLinks, batchLinks
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
