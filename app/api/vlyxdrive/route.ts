import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, parseHTML, encodeBase64 } from "@/lib/utils";

// Helper to check if key is valid JSON or String
const getKeyData = (key: string) => {
    try {
        const decoded = decodeBase64(key);
        // If it's a JSON string
        if (decoded.trim().startsWith("{")) {
            return JSON.parse(decoded);
        }
        // Fallback: assume it's a direct URL
        return { link: decoded };
    } catch (e) { return null; }
};

// Helper: Create Slug for next step
const generateKey = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const quality = searchParams.get("quality") || ""; 

  if (!key) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  const keyData = getKeyData(key);
  if (!keyData || !keyData.link) return NextResponse.json({ error: "Invalid Key" }, { status: 400 });

  const targetUrl = keyData.link; // mdrive or m4ulinks URL
  console.log("Scraping Drive:", targetUrl);

  try {
    const html = await fetchProxy(targetUrl, { cache: "no-store" });
    if (!html) throw new Error("Failed to load drive page");

    const $ = parseHTML(html);
    const links: any[] = [];
    
    // --- STRATEGY 1: MDrive Style (h5 > a) ---
    if (targetUrl.includes("mdrive")) {
        $("h5 a").each((_, elem) => {
            const href = $(elem).attr("href");
            const text = $(elem).text().trim();
            
            if (href) {
                let type = "unknown";
                if (text.includes("HubCloud") || href.includes("hubcloud")) type = "ncloud";
                else if (text.includes("GDFlix") || href.includes("gdflix")) type = "vcloud";

                if (type !== "unknown") {
                    links.push({
                        name: type === "ncloud" ? "N-Cloud" : "V-Cloud",
                        url: href,
                        type,
                        slug: generateKey(href)
                    });
                }
            }
        });
    } 
    
    // --- STRATEGY 2: M4uLinks Style (h4 + div) ---
    // (Purana logic bhi rakha hai taaki dono chal sakein)
    else {
        let targetDiv: any = null;
        // Search matching quality header
        $(".download-links-div h4").each((_, elem) => {
            const headerText = $(elem).text().trim();
            // Loose matching
            if (quality && headerText.includes(decodeURIComponent(quality).split(" ")[0])) {
                targetDiv = $(elem).next(".downloads-btns-div");
            }
        });

        // Agar quality match nahi hua, to pehla div utha lo (Fallback)
        if (!targetDiv) targetDiv = $(".downloads-btns-div").first();

        if (targetDiv) {
            targetDiv.find("a").each((_: any, el: any) => {
                const href = $(el).attr("href");
                if (href) {
                    let type = "unknown";
                    if (href.includes("hubcloud")) type = "ncloud";
                    else if (href.includes("gdflix")) type = "vcloud";

                    if (type !== "unknown") {
                        links.push({
                            name: type === "ncloud" ? "N-Cloud" : "V-Cloud",
                            url: href,
                            type,
                            slug: generateKey(href)
                        });
                    }
                }
            });
        }
    }

    return NextResponse.json({ status: true, source: targetUrl, data: links });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
