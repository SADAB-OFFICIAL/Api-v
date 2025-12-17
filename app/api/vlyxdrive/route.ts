import { NextResponse } from "next/server";
import { fetchProxy, decodeBase64, parseHTML, encodeBase64 } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const quality = searchParams.get("quality") || "";

  if (!key) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    const decoded = JSON.parse(decodeBase64(key));
    const html = await fetchProxy(decoded.link, 0); // 0 = No Cache
    const $ = parseHTML(html || "");
    
    let targetDiv: any = null;
    $(".download-links-div h4").each((_, elem) => {
      const text = $(elem).text().trim();
      const searchTerms = decodeURIComponent(quality).split(" ").filter(s => s.length > 2);
      if (searchTerms.every(term => text.includes(term))) targetDiv = $(elem).next(".downloads-btns-div");
    });

    const links: any[] = [];
    if (targetDiv) {
      targetDiv.find("a").each((_: any, el: any) => {
        const href = $(el).attr("href");
        if (href) {
            let type = "unknown";
            if (href.includes("hubcloud")) type = "ncloud";
            else if (href.includes("gdflix")) type = "vcloud";
            else if (href.includes("drive.google")) type = "gdrive";

            if(type !== "unknown") {
                links.push({ 
                    name: type.toUpperCase(), 
                    url: href, 
                    type,
                    // ✅ Slug for Next Step (N-Cloud)
                    slug: encodeBase64(JSON.stringify({ url: href }))
                });
            }
        }
      });
    }

    return NextResponse.json({ status: true, data: links });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
