import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, parseHTML, encodeBase64, decodeBase64 } from "@/lib/utils";

// Helper to safely parse key
const getUrlFromKey = (key: string) => {
  try {
    const decodedStr = decodeBase64(key);
    // Try parsing as JSON first
    if (decodedStr.trim().startsWith("{")) {
        const json = JSON.parse(decodedStr);
        return json.link || json.url;
    }
    // If not JSON, return string as is
    return decodedStr;
  } catch (e) {
    return null;
  }
};

const generateSlug = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const directUrl = searchParams.get("url"); 
  
  let targetUrl = "";
  if (key) targetUrl = getUrlFromKey(key);
  else if (directUrl) targetUrl = directUrl;

  if (!targetUrl) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    // ⚡ 12 Hours Cache
    const html = await fetchProxy(targetUrl, { next: { revalidate: 43200 } }); 
    if (!html) throw new Error("Failed to fetch page");

    const $ = parseHTML(html);
    const episodes: any[] = [];
    
    // Title Cleaning
    const title = $("h1").text().replace("Always Use Official Website", "").trim();

    // --- STRATEGY 1: MDrive (h5 Headers) ---
    if (targetUrl.includes("mdrive") || targetUrl.includes("moviesdrive")) {
        let currentEpNum = "";
        
        $("h5").each((_, elem) => {
            const text = $(elem).text().trim();
            const linkTag = $(elem).find("a");
            const href = linkTag.attr("href");

            // 1. Detect Episode Number (e.g. "Ep01 - 2160p")
            if (text.match(/Ep\s?\d+/i)) {
                const match = text.match(/Ep\s?(\d+)/i);
                if (match) currentEpNum = match[1];
            }

            // 2. Detect HubCloud Link
            if (href && (text.includes("HubCloud") || href.includes("hubcloud")) && currentEpNum) {
                episodes.push({
                    epNum: currentEpNum,
                    title: `Episode ${currentEpNum}`,
                    url: href,
                    slug: generateSlug(href)
                });
            }
        });
    }

    // --- STRATEGY 2: M4uLinks (h5 + div) ---
    else {
        $(".download-links-div h5").each((_, elem) => {
            const epTitle = $(elem).text().trim(); // e.g. "-:Episodes: 1:-"
            const epNum = epTitle.match(/\d+/)?.[0] || "?";
            const btnDiv = $(elem).next(".downloads-btns-div");
            
            // Extract HubCloud Link
            let hubCloudLink = btnDiv.find("a[href*='hubcloud']").attr("href");
            
            // Fallback for messy HTML
            if(!hubCloudLink) hubCloudLink = $(elem).find("a[href*='hubcloud']").attr("href");

            if (hubCloudLink) {
                episodes.push({
                    epNum,
                    title: `Episode ${epNum}`,
                    url: hubCloudLink,
                    slug: generateSlug(hubCloudLink)
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
