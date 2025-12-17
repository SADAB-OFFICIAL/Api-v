import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  try {
    const html = await fetchProxy(url);
    if (!html) throw new Error("Failed");

    const $ = cheerio.load(html);
    const episodes: any[] = [];
    const title = $("h1").text().replace("Always Use Official Website", "").trim();

    $(".download-links-div h5").each((_, elem) => {
      const epTitle = $(elem).text().trim();
      const epNum = epTitle.match(/\d+/)?.[0] || "?";
      const btnDiv = $(elem).next(".downloads-btns-div");
      
      const hubCloudLink = btnDiv.find("a[href*='hubcloud']").attr("href");
      if (hubCloudLink) {
        episodes.push({ epNum, title: `Episode ${epNum}`, url: hubCloudLink });
      }
    });

    return NextResponse.json({ status: true, title, episodes });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
