import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Input: Ya to direct URL ho, ya Encoded Key ho
  const urlParam = searchParams.get("url");
  const keyParam = searchParams.get("key");

  let hubUrl = "";

  // Logic to decode Key if provided
  if (keyParam) {
    try {
        const decoded = Buffer.from(keyParam, 'base64').toString('utf-8');
        // Check if it's JSON format or plain string
        if (decoded.trim().startsWith("{")) {
            const json = JSON.parse(decoded);
            hubUrl = json.url || json.link;
        } else {
            hubUrl = decoded;
        }
    } catch (e) {
        return NextResponse.json({ error: "Invalid Key" }, { status: 400 });
    }
  } else if (urlParam) {
    hubUrl = urlParam;
  } else {
    return NextResponse.json({ error: "Missing url or key parameter" }, { status: 400 });
  }

  try {
    // --- HOP 1: Fetch HubCloud Page ---
    const res1 = await fetch(`${PROXY_BASE}${hubUrl}`, { cache: "no-store" });
    const html1 = await res1.text();
    const $1 = cheerio.load(html1);

    // Get GamerXYT Link
    let gamerLink = $1("a#download").attr("href");
    
    // Fallback search
    if (!gamerLink) {
        $1("a.btn").each((_, el) => {
            if ($1(el).text().includes("Generate Direct Download Link")) {
                gamerLink = $1(el).attr("href");
            }
        });
    }

    if (!gamerLink) return NextResponse.json({ error: "Gamer Link Not Found" }, { status: 404 });

    // --- HOP 2: Fetch GamerXYT Page ---
    const res2 = await fetch(`${PROXY_BASE}${gamerLink}`, { cache: "no-store" });
    const html2 = await res2.text();
    const $2 = cheerio.load(html2);

    // Extract Final Links
    const finalLinks: any[] = [];
    $2("a.btn").each((_, el) => {
        const text = $2(el).text().trim().toLowerCase();
        const href = $2(el).attr("href");

        if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
            let type = "unknown";
            let name = $2(el).text().trim();

            // Identify Server Type
            if (text.includes("fslv2")) type = "FSLv2";
            else if (text.includes("fsl")) type = "FSL";
            else if (text.includes("pixel") || href.includes("pixeldrain")) type = "Pixel";
            else if (text.includes("zipdisk")) type = "ZipDisk";
            else if (text.includes("10gbps") || text.includes("server :")) type = "Fast-Server";
            else if (text.includes("telegram")) type = "Telegram";

            // Push to list
            if(type !== "unknown") {
                finalLinks.push({ name, url: href, type });
            }
        }
    });

    return NextResponse.json({ 
        status: true,
        source: hubUrl,
        servers: finalLinks 
    });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
