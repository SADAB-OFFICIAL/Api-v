import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, parseHTML, encodeBase64, decodeBase64 } from "@/lib/utils";

const getUrlFromKey = (key: string) => {
  try {
    const d = decodeBase64(key);
    return d.trim().startsWith("{") ? JSON.parse(d).link || JSON.parse(d).url : d;
  } catch (e) { return null; }
};

const generateSlug = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const directUrl = searchParams.get("url"); 
  
  let targetUrl = key ? getUrlFromKey(key) : directUrl;
  if (!targetUrl) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    const html = await fetchProxy(targetUrl, { next: { revalidate: 43200 } }); 
    if (!html) throw new Error("Fetch Failed");

    const $ = parseHTML(html);
    const episodes: any[] = [];
    const title = $("h1").text().replace("Always Use Official Website", "").trim();

    // --- LOGIC: MDrive vs M4uLinks ---
    if (targetUrl.includes("mdrive") || targetUrl.includes("moviesdrive")) {
        // MDrive Logic
        let currentEpNum = "";
        $("h5").each((_, elem) => {
            const text = $(elem).text().trim();
            const href = $(elem).find("a").attr("href");

            const epMatch = text.match(/Ep\s?(\d+)/i);
            if (epMatch) currentEpNum = epMatch[1];

            if (href && (text.includes("HubCloud") || href.includes("hubcloud")) && currentEpNum) {
                episodes.push({
                    epNum: currentEpNum,
                    title: `Episode ${currentEpNum}`,
                    url: href,
                    slug: generateSlug(href)
                });
            }
        });
    } else {
        // M4uLinks Logic
        $(".download-links-div h5").each((_, elem) => {
            const epNum = $(elem).text().match(/\d+/)?.[0] || "?";
            const btnDiv = $(elem).next(".downloads-btns-div");
            
            let hubLink = btnDiv.find("a[href*='hubcloud']").attr("href");
            if(!hubLink) hubLink = $(elem).find("a[href*='hubcloud']").attr("href");

            if (hubLink) {
                episodes.push({
                    epNum,
                    title: `Episode ${epNum}`,
                    url: hubLink,
                    slug: generateSlug(hubLink)
                });
            }
        });
    }

    return NextResponse.json({ 
        status: true, 
        title, 
        total: episodes.length,
        episodes 
    }, { headers: { 'Cache-Control': 'public, s-maxage=43200' } });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
