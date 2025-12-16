import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Wohi Proxy
const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

// Helper to Decode Base64 (Server Side)
const decodeKey = (str: string) => {
  try {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
  } catch (e) {
    return null;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. Input: Encoded Key (Slug) & Quality
  const key = searchParams.get("key"); 
  const qualityParam = searchParams.get("quality") || ""; // Optional filtering

  if (!key) {
    return NextResponse.json({ status: false, error: "Missing Key" }, { status: 400 });
  }

  // 2. Decode Key to get URL
  const decoded = decodeKey(key);
  if (!decoded || !decoded.link) {
    return NextResponse.json({ status: false, error: "Invalid Key Format" }, { status: 400 });
  }

  const m4uLink = decoded.link; // https://m4ulinks.com/number/47182

  try {
    // 3. Fetch Page via Proxy
    const res = await fetch(`${PROXY_BASE}${m4uLink}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const finalLinks: any[] = [];
    
    // Search Terms (e.g. "720p HEVC")
    const searchTerms = decodeURIComponent(qualityParam).split(" ").filter(s => s.length > 2);

    // 4. Loop through all Quality Headers (h4)
    $(".download-links-div h4").each((_, elem) => {
      const headerText = $(elem).text().trim(); // e.g. "720p HEVC [1GB]"
      const linkDiv = $(elem).next(".downloads-btns-div");

      // Agar quality param diya hai, to match karo. Warna sab utha lo.
      let isMatch = true;
      if (searchTerms.length > 0) {
         isMatch = searchTerms.every(term => headerText.includes(term));
      }

      if (isMatch && linkDiv.length > 0) {
        // 5. Extract Links from Buttons
        linkDiv.find("a").each((_, anchor) => {
            const href = $(anchor).attr("href");
            const btnText = $(anchor).text().toLowerCase();

            if (href) {
                let serverName = "Unknown";
                let serverType = "cloud"; // icon logic

                // Server Identification Logic
                if (href.includes("hubcloud") || href.includes("hubdrive")) {
                    serverName = "N-Cloud"; // HubCloud -> N-Cloud
                    serverType = "ncloud";
                } 
                else if (href.includes("gdflix") || href.includes("skymovies")) {
                    serverName = "V-Cloud"; // GDFlix -> V-Cloud
                    serverType = "vcloud";
                }
                else if (href.includes("drive.google")) {
                    serverName = "G-Drive";
                    serverType = "gdrive";
                }

                // Add to list
                finalLinks.push({
                    name: serverName,
                    url: href,
                    type: serverType,
                    quality: headerText // Kis quality ka link hai ye bhi store kar liya
                });
            }
        });
      }
    });

    return NextResponse.json({ 
        status: true, 
        total: finalLinks.length,
        data: finalLinks 
    });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
