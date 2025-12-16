import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

// Helper 1: Clean Title
const cleanTitle = (raw: string) => {
  return raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();
};

// Helper 2: Generate Vlyx Key (JSON -> Base64)
// Ye wahi key banayega jo aapko manually banana pad raha tha
const generateVlyxKey = (link: string) => {
  const json = JSON.stringify({ link: link });
  return Buffer.from(json).toString('base64');
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const slug = searchParams.get("slug");
  const directUrl = searchParams.get("url");

  let targetUrl = "";

  if (slug) {
    try {
        // Handle URL safe base64 strings if needed
        const base64String = slug.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(base64String, 'base64').toString('utf-8');
        
        if(decoded.includes("|||")) {
            const [path, baseUrl] = decoded.split("|||");
            targetUrl = `${baseUrl}/${path}/`;
        } else {
            // Fallback if separator missing
             targetUrl = decoded; 
        }
    } catch (e) {
        return NextResponse.json({ error: "Invalid Slug" }, { status: 400 });
    }
  } else if (directUrl) {
    targetUrl = directUrl;
  } else {
    return NextResponse.json({ error: "Missing slug or url" }, { status: 400 });
  }

  try {
    const res = await fetch(`${PROXY_BASE}${targetUrl}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const rawTitle = $("h1").first().text().trim();
    const title = cleanTitle(rawTitle);
    const poster = $(".post-thumbnail img").attr("src");
    const description = $("h3:contains('Storyline')").next("p").text().trim();

    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    $(".download-links-div h4").each((_, elem) => {
      const label = $(elem).text().trim(); // e.g. "720p HEVC [1GB]"
      const linkDiv = $(elem).next(".downloads-btns-div");
      
      const resMatch = label.match(/(\d{3,4}p)/);
      const res = resMatch ? resMatch[0] : "HD";
      const isHEVC = label.toLowerCase().includes("hevc");
      
      // 1. Normal/Episode Links
      const normalBtn = linkDiv.find("a.btn:not(.btn-zip)").attr("href");
      if (normalBtn) {
         const sizeMatch = label.match(/\[(\d+(\.\d+)?[GM]B)(\/E)?\]/);
         
         episodeLinks.push({ 
             label, 
             res, 
             isHEVC, 
             size: sizeMatch ? sizeMatch[1] : "N/A",
             url: normalBtn,
             // 🔥 NEW: Pre-generated Key for VlyxDrive
             vlyx_key: generateVlyxKey(normalBtn) 
         });
      }

      // 2. Zip/Batch Links
      const zipBtn = linkDiv.find("a.btn-zip").attr("href");
      if (zipBtn) {
         const zipText = linkDiv.find("a.btn-zip").text();
         const sizeMatch = zipText.match(/\[(\d+(\.\d+)?[GM]B)\]/);
         
         batchLinks.push({ 
             label: label.replace("Episode", "Season"), 
             res, 
             isHEVC,
             size: sizeMatch ? sizeMatch[1] : "Zip",
             url: zipBtn,
             // 🔥 NEW: Pre-generated Key for VlyxDrive
             key: generateVlyxKey(zipBtn)
         });
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
