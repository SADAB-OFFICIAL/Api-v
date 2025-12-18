import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, encodeBase64 } from "@/lib/utils";

const cleanTitle = (raw: string) => {
  return raw
    .replace(/\(\d{4}\).*/, "") 
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

    // 1. Basic Info
    const rawTitle = $("h1").first().text().trim();
    const title = cleanTitle(rawTitle);
    const poster = $(".post-thumbnail img").attr("src");
    
    // Description logic
    let description = $("h3:contains('Storyline')").next("p").text().trim();
    if(!description) description = $("h3:contains('Storyline')").next("h5").text().trim();

    // 2. 🔥 NEW: Screenshots Extraction
    const screenshots: string[] = [];
    $(".ss-img img").each((_, elem) => {
        const src = $(elem).attr("src");
        if (src) screenshots.push(src);
    });

    // 3. Extract Links
    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    // Support for both Movies4u (.download-links-div) and MoviesDrive (.page-body h5)
    const linkContainers = $(".download-links-div h4, .page-body h5");

    linkContainers.each((_, elem) => {
        const text = $(elem).text().trim();
        
        // Find link logic (Supports both structures)
        let linkTag = $(elem).find("a");
        let linkDiv = $(elem).next(".downloads-btns-div");
        
        // If not inside h4/h5, look in next div (Movies4u style)
        if (linkTag.length === 0 && linkDiv.length > 0) {
            // Check for Normal Link
            let normalA = linkDiv.find("a.btn:not(.btn-zip)").first();
            if(normalA.length > 0) {
                 processLink(text, normalA, episodeLinks);
            }
            // Check for Zip Link
            let zipA = linkDiv.find("a.btn-zip").first();
            if(zipA.length > 0) {
                 processLink(text.replace("Episode", "Season"), zipA, batchLinks);
            }
        } 
        // Direct Link inside Header (MoviesDrive style)
        else if (linkTag.length > 0) {
            if (text.includes("Zip") || text.includes("Pack")) {
                processLink(text, linkTag, batchLinks);
            } else {
                processLink(text, linkTag, episodeLinks);
            }
        }
    });

    const isSeries = batchLinks.length > 0 || rawTitle.includes("Season");

    return NextResponse.json({ 
        status: true, 
        data: { 
            title, 
            poster, 
            description, 
            screenshots, // ✅ Sent to frontend
            isSeries, 
            episodeLinks, 
            batchLinks 
        } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

// Internal Helper to process links
function processLink(label: string, anchor: any, targetArray: any[]) {
    const url = anchor.attr("href");
    if (!url) return;

    // Filter valid quality links only
    if (!label.includes("480p") && !label.includes("720p") && !label.includes("1080p") && !label.includes("2160p")) return;

    const resMatch = label.match(/(\d{3,4}p)/);
    const res = resMatch ? resMatch[0] : "HD";
    const sizeMatch = label.match(/\[(\d+(\.\d+)?[GM]B)(\/E)?\]/);
    const size = sizeMatch ? sizeMatch[1] : "N/A";
    const isHEVC = label.toLowerCase().includes("hevc");

    targetArray.push({
        label: label.trim(),
        res,
        size,
        isHEVC,
        url,
        vlyx_key: generateVlyxKey(url),
        slug: generateVlyxKey(url)
    });
}
