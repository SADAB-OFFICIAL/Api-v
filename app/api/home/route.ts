import { NextResponse } from "next/server";
import { fetchProxy, SOURCE_DOMAIN, encodeBase64, parseHTML } from "@/lib/utils";

const cleanTitle = (raw: string) => raw.split(/HQ|HDTC|Dual Audio|480p|720p|1080p|WEB-DL/i)[0].trim();

export async function GET() {
  try {
    const html = await fetchProxy(SOURCE_DOMAIN, 3600);
    if (!html) return NextResponse.json({ status: false, error: "Source Unavailable" }, { status: 503 });

    const $ = parseHTML(html);
    const movies: any[] = [];

    // Support both Normal and Google Cache Structure
    $("article.post, div.post").each((_, element) => {
      const titleTag = $(element).find(".entry-title a, h2 a");
      const imgTag = $(element).find("figure img, img");
      
      const rawTitle = titleTag.text().trim();
      const poster = imgTag.attr("src");
      const link = titleTag.attr("href");
      
      if (rawTitle && link && poster) {
        // Clean Link (Remove Google Cache Prefix if present)
        let cleanLink = link;
        if (link.includes("url?q=")) {
            cleanLink = link.split("url?q=")[1].split("&")[0];
        }

        const slugPart = cleanLink.replace(SOURCE_DOMAIN, "").replace(/\//g, "");
        const fullSlug = encodeBase64(`${slugPart}|||${SOURCE_DOMAIN}`);
        
        movies.push({ 
            title: cleanTitle(rawTitle), 
            poster, 
            slug: fullSlug
        });
      }
    });

    return NextResponse.json({ status: true, data: movies });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
