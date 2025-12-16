import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PROXY_BASE = "https://proxy.vlyx.workers.dev/?url=";
const SOURCE_DOMAIN = "https://movies4u.nexus";

export async function GET() {
  try {
    const res = await fetch(`${PROXY_BASE}${SOURCE_DOMAIN}`, { cache: "no-store" });
    const html = await res.text();
    const $ = cheerio.load(html);

    const movies: any[] = [];

    $("article.post").each((_, element) => {
      const title = $(element).find(".entry-title a").text().trim();
      const poster = $(element).find("figure img").attr("src");
      const link = $(element).find(".entry-title a").attr("href");
      
      if (title && link) {
        movies.push({ title, poster, link });
      }
    });

    return NextResponse.json({ status: true, data: movies });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
