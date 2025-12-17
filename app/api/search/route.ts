import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, SOURCE_DOMAIN, encodeBase64, parseHTML } from "@/lib/utils";

// Clean Title Helper
const cleanTitle = (raw: string) => raw.replace(/\(\d{4}\).*/, "").trim();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) return NextResponse.json({ error: "Missing Query" }, { status: 400 });

  try {
    // MoviesDrive Search URL Pattern: https://moviesdrive.pics/?s=iron+man
    const targetUrl = `${SOURCE_DOMAIN}/?s=${encodeURIComponent(query)}`;
    
    // No Cache for search (Realtime results)
    const html = await fetchProxy(targetUrl, { cache: "no-store" });
    
    if (!html) return NextResponse.json({ error: "Search Failed" }, { status: 503 });

    const $ = cheerio.load(html);
    const results: any[] = [];

    // Same selector logic as Home Page
    $("article.post").each((_, element) => {
      const titleTag = $(element).find(".entry-title a");
      const imgTag = $(element).find("figure img");
      
      if (titleTag && imgTag) {
        const rawTitle = titleTag.text().trim();
        const poster = imgTag.attr("src");
        const link = titleTag.attr("href");

        if (link) {
            const slugPart = link.replace(SOURCE_DOMAIN, "").replace(/\//g, "");
            const fullSlug = `${slugPart}|||${SOURCE_DOMAIN}`;
            
            results.push({ 
                title: cleanTitle(rawTitle), 
                poster, 
                slug: encodeBase64(fullSlug)
            });
        }
      }
    });

    return NextResponse.json({ status: true, data: results });

  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
