import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, parseHTML, encodeBase64 } from "@/lib/utils";

const getKeyData = (key: string) => {
    try {
        const decoded = decodeBase64(key);
        if (decoded.trim().startsWith("{")) return JSON.parse(decoded);
        return { link: decoded };
    } catch (e) { return null; }
};

const generateKey = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  const keyData = getKeyData(key);
  if (!keyData || !keyData.link) return NextResponse.json({ error: "Invalid Key" }, { status: 400 });

  try {
    const html = await fetchProxy(keyData.link, { cache: "no-store" });
    const $ = parseHTML(html || "");
    const links: any[] = [];
    
    // --- STRATEGY 1: Image Based Links (Common in Movies) ---
    // <p><a href="..."><img src="hubcloud.png"></a></p>
    $("p a, h4 a").each((_, elem) => {
        const href = $(elem).attr("href");
        const imgSrc = $(elem).find("img").attr("src") || "";
        
        if (href) {
             let type = "unknown";
             if (href.includes("hubcloud") || imgSrc.includes("hubcloud")) type = "ncloud";
             else if (href.includes("gdflix") || imgSrc.includes("gdflix")) type = "vcloud";

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

    // --- STRATEGY 2: Text Based Links (Common in Series/Zips) ---
    // <h5><a href="...">HubCloud</a></h5>
    if (links.length === 0) {
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

    return NextResponse.json({ status: true, data: links });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
