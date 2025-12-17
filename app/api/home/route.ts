import { NextResponse } from "next/server";
import { fetchProxy, SOURCE_DOMAIN, encodeBase64, parseHTML } from "@/lib/utils";

// Clean unwanted text from titles
const cleanTitle = (raw: string) => raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();

export async function GET() {
  try {
    // ⚡ 86400 seconds = 24 Hours Cache
    const html = await fetchProxy(SOURCE_DOMAIN, 86400); 
    if (!html) return NextResponse.json({ status: false, error: "Source Down" }, { status: 503 });

    const $ = parseHTML(html);
    const movies: any[] = [];

    $("article.post").each((_, element) => {
      const rawTitle = $(element).find(".entry-title a").text().trim();
      const poster = $(element).find("figure img").attr("src");
      const link = $(element).find(".entry-title a").attr("href");
      
      if (rawTitle && link && poster) {
        const slugPart = link.replace(SOURCE_DOMAIN, "").replace(/\//g, "");
        // Frontend ke liye ready-made SLUG
        const fullSlug = encodeBase64(`${slugPart}|||${SOURCE_DOMAIN}`);
        
        movies.push({ 
            title: cleanTitle(rawTitle), 
            poster, 
            slug: fullSlug 
        });
      }
    });

    // Cache-Control Header for Browser Caching
    return NextResponse.json(
        { status: true, data: movies }, 
        { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=59' } }
    );
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
