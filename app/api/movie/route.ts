import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, encodeBase64 } from "@/lib/utils";

// Clean Title Helper
const cleanTitle = (raw: string) => {
  return raw
    .replace(/\(\d{4}\).*/, "") // Remove year and after
    .replace(/Download|Full Movie|Dual Audio|Hindi|English|480p|720p|1080p|WEB-DL|Season \d+/gi, "")
    .trim();
};

const generateVlyxKey = (link: string) => encodeBase64(JSON.stringify({ link }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  if (!slug) return NextResponse.json({ error: "Missing Slug" }, { status: 400 });

  let targetUrl = "";
  try {
      const decoded = decodeBase64(slug);
      const [path, baseUrl] = decoded.split("|||");
      targetUrl = `${baseUrl}/${path}/`;
  } catch (e) { return NextResponse.json({ error: "Invalid Slug" }, { status: 400 }); }

  try {
    const html = await fetchProxy(targetUrl, { next: { revalidate: 3600 } });
    if (!html) throw new Error("Source Down");

    const $ = cheerio.load(html);

    // 1. Title
    const rawTitle = $("h1.page-title span.material-text").text().trim();
    const title = cleanTitle(rawTitle);

    // 2. Poster
    const poster = $(".page-body img.aligncenter").first().attr("src");

    // 3. Description (Storyline Logic)
    let description = "";
    $("h3").each((_, elem) => {
        if ($(elem).text().includes("Storyline")) {
            // MoviesDrive puts description in the next h5 tag
            description = $(elem).next("h5").text().trim();
            // Sometimes it's in p tag
            if (!description) description = $(elem).next("p").text().trim();
        }
    });

    // 4. Extract Links
    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    // MoviesDrive Structure: h5 tags contain links
    $(".page-body h5").each((_, elem) => {
        const text = $(elem).text().trim();
        const linkTag = $(elem).find("a");
        const url = linkTag.attr("href");

        if (url && (text.includes("480p") || text.includes("720p") || text.includes("1080p") || text.includes("2160p"))) {
            
            const resMatch = text.match(/(\d{3,4}p)/);
            const res = resMatch ? resMatch[0] : "HD";
            const isHEVC = text.toLowerCase().includes("hevc") || text.includes("10Bit");
            
            // Size Extraction (e.g., [210MB/E] or [1.9GB])
            const sizeMatch = text.match(/\[(\d+(\.\d+)?[GM]B)(\/E)?\]/);
            const size = sizeMatch ? sizeMatch[1] : "N/A";

            const linkObj = {
                label: text,
                res,
                size,
                isHEVC,
                url,
                vlyx_key: generateVlyxKey(url)
            };

            // Zip/Batch Detection
            if (text.includes("Zip") || text.includes("Pack") || text.includes("Batch")) {
                batchLinks.push(linkObj);
            } else {
                episodeLinks.push(linkObj);
            }
        }
    });

    const isSeries = batchLinks.length > 0 || rawTitle.includes("Season");

    return NextResponse.json({ 
        status: true, 
        data: { title, poster, description, isSeries, episodeLinks, batchLinks } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
