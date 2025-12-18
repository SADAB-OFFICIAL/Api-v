import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, parseHTML, encodeBase64 } from "@/lib/utils";

const getUrlFromKey = (key: string) => {
  try {
    const decodedStr = decodeBase64(key);
    if (decodedStr.trim().startsWith("{")) {
        return JSON.parse(decodedStr).link;
    }
    return decodedStr;
  } catch (e) { return null; }
};

const generateKey = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const quality = searchParams.get("quality") || "";

  const targetUrl = key ? getUrlFromKey(key) : null;
  if (!targetUrl) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    const html = await fetchProxy(targetUrl, { cache: "no-store" });
    const $ = parseHTML(html || "");
    
    let targetDiv: any = null;
    
    // Match Quality (e.g. 720p HEVC)
    $(".download-links-div h4").each((_, elem) => {
      const text = $(elem).text().trim();
      const searchTerms = decodeURIComponent(quality).split(" ").filter(s => s.length > 2);
      const isMatch = searchTerms.every(term => text.includes(term));
      
      if (isMatch) targetDiv = $(elem).next(".downloads-btns-div");
    });

    const links: any[] = [];
    if (targetDiv) {
      targetDiv.find("a").each((_: any, el: any) => {
        const href = $(el).attr("href");
        if (href) {
            let type = "unknown";
            if (href.includes("hubcloud")) type = "ncloud";
            else if (href.includes("gdflix")) type = "vcloud";
            else if (href.includes("drive.google")) type = "gdrive";

            if (type !== "unknown") {
                links.push({
                    name: type === "ncloud" ? "N-Cloud" : (type === "vcloud" ? "V-Cloud" : "G-Drive"),
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
