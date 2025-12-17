import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Proxy List (Agar ek fail ho to future mein doosra use kar sako)
const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

// Helper: Clean Title
const cleanTitle = (raw: string) => {
  return raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();
};

// Helper: Generate Key
const generateVlyxKey = (link: string) => {
  const json = JSON.stringify({ link: link });
  return Buffer.from(json).toString('base64');
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  if (!slug) return NextResponse.json({ error: "Missing Slug" }, { status: 400 });

  let targetUrl = "";
  try {
      // Decode Slug
      const decoded = Buffer.from(slug, 'base64').toString('utf-8');
      if(decoded.includes("|||")) {
          const [path, baseUrl] = decoded.split("|||");
          targetUrl = `${baseUrl}/${path}/`;
      } else {
          return NextResponse.json({ error: "Invalid Slug Format" }, { status: 400 });
      }
  } catch (e) {
      return NextResponse.json({ error: "Failed to decode slug" }, { status: 400 });
  }

  try {
    // 1. Fetch Page with Headers (To look like a real browser)
    const res = await fetch(`${PROXY_BASE}${targetUrl}`, { 
        cache: "no-store",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
    });

    if (!res.ok) throw new Error(`Proxy Error: ${res.status}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);

    // 2. 🚨 ERROR DETECTION (Ye naya part hai)
    const pageTitle = $("title").text();
    const h1Text = $("h1").first().text().trim();
    
    // Agar page Error wala hai, to process mat karo
    if (pageTitle.includes("522") || h1Text.includes("Connection timed out") || h1Text.includes("Error")) {
        return NextResponse.json({ 
            status: false, 
            error: "Source Website is Down or Blocking Proxy (522 Error). Try again later." 
        }, { status: 503 });
    }

    // 3. Normal Scraping
    const title = cleanTitle(h1Text);
    const poster = $(".post-thumbnail img").attr("src");
    const description = $("h3:contains('Storyline')").next("p").text().trim();

    const episodeLinks: any[] = [];
    const batchLinks: any[] = [];

    // Extract Links
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
             url: normalBtn,
             vlyx_key: generateVlyxKey(normalBtn) 
         });
      }

      // Batch Links
      const zipBtn = linkDiv.find("a.btn-zip").attr("href");
      if (zipBtn) {
         const zipText = linkDiv.find("a.btn-zip").text();
         const sizeMatch = zipText.match(/\[(\d+(\.\d+)?[GM]B)\]/);
         batchLinks.push({ 
             label: label.replace("Episode", "Season"), res, isHEVC,
             size: sizeMatch ? sizeMatch[1] : "Zip",
             url: zipBtn,
             vlyx_key: generateVlyxKey(zipBtn)
         });
      }
    });

    // Check if scraping worked
    if (!title || episodeLinks.length === 0 && batchLinks.length === 0) {
         return NextResponse.json({ status: false, error: "Content not found or Structure changed" }, { status: 404 });
    }

    const isSeries = batchLinks.length > 0 || title.includes("Season");

    return NextResponse.json({
        status: true,
        data: {
            title, poster, description, isSeries, episodeLinks, batchLinks
        }
    });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
