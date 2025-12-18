import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, parseHTML, encodeBase64, decodeBase64 } from "@/lib/utils";

const getUrlFromKey = (key: string) => {
  try {
    const decodedStr = decodeBase64(key);
    if (decodedStr.trim().startsWith("{")) {
        const json = JSON.parse(decodedStr);
        return json.link || json.url;
    }
    return decodedStr;
  } catch (e) { return null; }
};

const generateSlug = (url: string) => encodeBase64(JSON.stringify({ url }));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  
  const targetUrl = key ? getUrlFromKey(key) : null;
  if (!targetUrl) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    const html = await fetchProxy(targetUrl, { next: { revalidate: 43200 } });
    if (!html) throw new Error("Failed");

    const $ = parseHTML(html);
    const episodes: any[] = [];
    const title = $("h1").text().replace("Always Use Official Website", "").trim();

    // Movies4u Logic: h5 -> div
    $(".download-links-div h5").each((_, elem) => {
      const epTitle = $(elem).text().trim(); // e.g. "-:Episodes: 1:-"
      const epNum = epTitle.match(/\d+/)?.[0] || "?";
      const btnDiv = $(elem).next(".downloads-btns-div");
      
      let hubCloudLink = btnDiv.find("a[href*='hubcloud']").attr("href");
      // Fallback
      if(!hubCloudLink) hubCloudLink = $(elem).find("a[href*='hubcloud']").attr("href");

      if (hubCloudLink) {
        episodes.push({
          epNum,
          title: `Episode ${epNum}`,
          url: hubCloudLink,
          slug: generateSlug(hubCloudLink) // Key for N-Cloud
        });
      }
    });

    return NextResponse.json({ status: true, title, total: episodes.length, episodes });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
