import { NextResponse } from "next/server";
import { fetchProxy, decodeBase64, parseHTML } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) return NextResponse.json({ error: "Missing Key" }, { status: 400 });

  try {
    // Decode Key
    let hubUrl = "";
    try {
        const json = JSON.parse(decodeBase64(key));
        hubUrl = json.url || json.link;
    } catch(e) { hubUrl = decodeBase64(key); }

    // HOP 1: HubCloud
    const html1 = await fetchProxy(hubUrl, 0);
    const $1 = parseHTML(html1 || "");

    let gamerLink = $1("a#download").attr("href");
    if (!gamerLink) {
        $1("a.btn").each((_, el) => {
            if ($1(el).text().includes("Generate Direct Download Link")) gamerLink = $1(el).attr("href");
        });
    }

    if (!gamerLink) return NextResponse.json({ error: "Link Not Found" }, { status: 404 });

    // HOP 2: GamerXYT
    const html2 = await fetchProxy(gamerLink, 0);
    const $2 = parseHTML(html2 || "");

    const finalLinks: any[] = [];
    $2("a.btn").each((_, el) => {
        const text = $2(el).text().trim().toLowerCase();
        const href = $2(el).attr("href");

        if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
            let type = "Link";
            if (text.includes("fslv2")) type = "FSLv2";
            else if (text.includes("fsl")) type = "FSL";
            else if (text.includes("pixel")) type = "Pixel";
            else if (text.includes("zipdisk")) type = "ZipDisk";
            else if (text.includes("10gbps")) type = "Fast-Server";

            finalLinks.push({ name: $2(el).text().trim(), url: href, type });
        }
    });

    return NextResponse.json({ status: true, servers: finalLinks });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
