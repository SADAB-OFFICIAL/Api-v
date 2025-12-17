import { NextResponse } from "next/server";
import { fetchProxy, decodeBase64, parseHTML, encodeBase64 } from "@/lib/utils";

const cleanTitle = (raw: string) => raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();
// Helper to create next API key
const generateKey = (link: string) => encodeBase64(JSON.stringify({ link }));

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
    // ⚡ 24 Hours Cache
    const html = await fetchProxy(targetUrl, 86400); 
    if (!html) return NextResponse.json({ error: "Source Timeout (522)" }, { status: 503 });

    const $ = parseHTML(html);
    
    // Basic Info
    const rawTitle = $("h1").first().text().trim();
    const title = cleanTitle(rawTitle);
    const poster = $(".post-thumbnail img").attr("src");
    const description = $("h3:contains('Storyline')").next("p").text().trim();

    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    // Extract Links & Add Slugs
    $(".download-links-div h4").each((_, elem) => {
      const label = $(elem).text().trim();
      const linkDiv = $(elem).next(".downloads-btns-div");
      
      const resMatch = label.match(/(\d{3,4}p)/);
      const res = resMatch ? resMatch[0] : "HD";
      
      // Normal Links (Single Movie / Episode List)
      const normalBtn = linkDiv.find("a.btn:not(.btn-zip)").attr("href");
      if (normalBtn) {
         const sizeMatch = label.match(/\[(\d+(\.\d+)?[GM]B)(\/E)?\]/);
         episodeLinks.push({ 
             label, res, 
             size: sizeMatch ? sizeMatch[1] : "N/A",
             url: normalBtn,
             // ✅ Slug for Next API (VlyxDrive)
             slug: generateKey(normalBtn) 
         });
      }

      // Batch Links (Series Zip)
      const zipBtn = linkDiv.find("a.btn-zip").attr("href");
      if (zipBtn) {
         batchLinks.push({ 
             label: label.replace("Episode", "Season"), res, 
             size: "Zip",
             url: zipBtn,
             // ✅ Slug for Next API (VlyxDrive)
             slug: generateKey(zipBtn)
         });
      }
    });

    const isSeries = batchLinks.length > 0 || title.includes("Season");

    return NextResponse.json({ 
        status: true, 
        data: { title, poster, description, isSeries, episodeLinks, batchLinks } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
