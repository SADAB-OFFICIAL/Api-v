import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url"); // m4ulinks URL

  if (!url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  try {
    const res = await fetch(`${PROXY_BASE}${url}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

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
          url: hubCloudLink
        });
      }
    });

    return NextResponse.json({ title, episodes });

  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
