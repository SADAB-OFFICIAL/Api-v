import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const m4uLink = searchParams.get("url");

  if (!m4uLink) return NextResponse.json({ status: false, error: "Missing URL" });

  try {
    const res = await fetch(`${PROXY_BASE}${m4uLink}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const episodes: any[] = [];

    // M4uLinks Page Structure Parsing
    $(".download-links-div h5").each((_, elem) => {
      const epTitle = $(elem).text().trim(); // "-:Episodes: 1:-"
      const btnDiv = $(elem).next(".downloads-btns-div");
      
      const hubCloudLink = btnDiv.find("a[href*='hubcloud']").attr("href");
      const gdFlixLink = btnDiv.find("a[href*='gdflix']").attr("href");

      if (hubCloudLink || gdFlixLink) {
        episodes.push({
          title: epTitle.replace(/-:|:-/g, "").trim(),
          hubCloud: hubCloudLink,
          gdFlix: gdFlixLink
        });
      }
    });

    return NextResponse.json({ status: true, data: episodes });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
