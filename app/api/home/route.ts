import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, SOURCE_DOMAIN, encodeBase64 } from "@/lib/utils";

// Clean Title Helper (MoviesDrive titles are long)
const cleanTitle = (raw: string) => {
  return raw
    .replace(/\(\d{4}\).*/, "") // Remove year and everything after
    .replace(/Download|Full Movie|Dual Audio|Hindi|English|480p|720p|1080p|WEB-DL/gi, "")
    .trim();
};

export async function GET() {
  try {
    // ⚡ 1 Hour Cache
    const html = await fetchProxy(SOURCE_DOMAIN, { next: { revalidate: 3600 } });
    
    if (!html) return NextResponse.json({ error: "Source Down" }, { status: 503 });

    const $ = cheerio.load(html);
    const movies: any[] = [];

    // ✅ NEW SELECTOR Logic for MoviesDrive
    $("ul.recent-movies li.thumb").each((_, element) => {
      const imgTag = $(element).find("figure img");
      const linkTag = $(element).find("figure a");
      const titleTag = $(element).find("figcaption p");

      if (imgTag && linkTag && titleTag) {
        const rawTitle = titleTag.text().trim();
        const poster = imgTag.attr("src");
        const link = linkTag.attr("href");

        if (link) {
            // Slug Creation Logic
            const slugPart = link.replace(SOURCE_DOMAIN, "").replace(/\//g, "");
            const fullSlug = `${slugPart}|||${SOURCE_DOMAIN}`;
            
            movies.push({ 
                title: rawTitle, // UI pe poora title dikhana behtar hai, clean client side pe kar lenge
                poster, 
                slug: encodeBase64(fullSlug)
            });
        }
      }
    });

    return NextResponse.json({ status: true, data: movies });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
