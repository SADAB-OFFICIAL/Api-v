import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchProxy, decodeBase64, parseHTML } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  
  let hubUrl = "";
  try {
      const decoded = JSON.parse(decodeBase64(key || ""));
      hubUrl = decoded.url || decoded.link;
  } catch(e) { return NextResponse.json({ error: "Invalid Key" }, { status: 400 }); }

  try {
    // HOP 1: HubCloud
    const html1 = await fetchProxy(hubUrl, { cache: "no-store" });
    const $1 = parseHTML(html1 || "");

    let gamerLink = $1("a#download").attr("href");
    if (!gamerLink) {
        $1("a.btn").each((_, el) => {
            if ($1(el).text().includes("Generate Direct Download Link")) gamerLink = $1(el).attr("href");
        });
    }

    if (!gamerLink) return NextResponse.json({ error: "Gamer Link Not Found" }, { status: 404 });

    // HOP 2: GamerXYT
    const html2 = await fetchProxy(gamerLink, { cache: "no-store" });
    const $2 = parseHTML(html2 || "");

    const finalLinks: any[] = [];
    $2("a.btn").each((_, el) => {
        const text = $2(el).text().trim().toLowerCase();
        const href = $2(el).attr("href");

        if (href && !href.startsWith("#")) {
            let type = "unknown";
            if (text.includes("fslv2")) type = "FSLv2";
            else if (text.includes("fsl")) type = "FSL";
            else if (text.includes("pixel")) type = "Pixel";
            else if (text.includes("zipdisk")) type = "ZipDisk";
            else if (text.includes("10gbps")) type = "Fast-Server";

            if(type !== "unknown") {
                finalLinks.push({ name: $2(el).text().trim(), url: href, type });
            }
        }
    });

    return NextResponse.json({ status: true, servers: finalLinks });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
