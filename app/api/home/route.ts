import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, SOURCE_DOMAIN, encodeBase64 } from "@/lib/utils";

const cleanTitle = (raw: string) => raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();

export async function GET() {
  try {
    // 1 Hour Cache
    const html = await fetchProxy(SOURCE_DOMAIN, { next: { revalidate: 3600 } });
    if (!html) return NextResponse.json({ error: "Source Down" }, { status: 503 });

    const $ = cheerio.load(html);
    const movies: any[] = [];

    $("article.post").each((_, element) => {
      const rawTitle = $(element).find(".entry-title a").text().trim();
      const poster = $(element).find("figure img").attr("src");
      const link = $(element).find(".entry-title a").attr("href");
      
      if (rawTitle && link && poster) {
        const slugPart = link.replace(SOURCE_DOMAIN, "").replace(/\//g, "");
        const fullSlug = `${slugPart}|||${SOURCE_DOMAIN}`;
        
        movies.push({ 
            title: cleanTitle(rawTitle), 
            poster, 
            slug: encodeBase64(fullSlug)
        });
      }
    });

    return NextResponse.json({ status: true, data: movies });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
