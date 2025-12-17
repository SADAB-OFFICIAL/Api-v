import { NextResponse } from "next/server";
import { fetchProxy, parseHTML, encodeBase64, decodeBase64 } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  
  if (!key) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    const { link } = JSON.parse(decodeBase64(key)); // m4ulinks URL
    // ⚡ 12 Hours Cache
    const html = await fetchProxy(link, 43200); 
    if (!html) throw new Error("Failed");

    const $ = parseHTML(html);
    const episodes: any[] = [];
    const title = $("h1").text().replace("Always Use Official Website", "").trim();

    $(".download-links-div h5").each((_, elem) => {
      const epTitle = $(elem).text().trim(); // "-:Episodes: 1:-"
      const epNum = epTitle.match(/\d+/)?.[0] || "?";
      const btnDiv = $(elem).next(".downloads-btns-div");
      
      const hubCloudLink = btnDiv.find("a[href*='hubcloud']").attr("href");
      if (hubCloudLink) {
        episodes.push({
          epNum,
          title: `Episode ${epNum}`,
          url: hubCloudLink,
          // ✅ Requested: Slug for N-Cloud API
          slug: encodeBase64(JSON.stringify({ url: hubCloudLink }))
        });
      }
    });

    return NextResponse.json({ status: true, title, episodes }, { headers: { 'Cache-Control': 'public, s-maxage=43200' } });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
