import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as cheerio from "cheerio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ CONFIGURATION
// Agar .nexus down hai to .vip ya .foo try karna
export const SOURCE_DOMAIN = "https://movies4u.nexus"; 
const SCRAPING_ANT_TOKEN = "9737b3c9d7bf449787e369f953f6c440"; // Tumhara API Key

// Base64 Helpers
export const encodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

export const decodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str, "base64").toString("utf-8");
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

// HTML Parser
export const parseHTML = (html: string) => {
  return cheerio.load(html);
};

// 🔥 POWERFUL FETCHER (Using ScrapingAnt)
export const fetchProxy = async (url: string, options: any = { cache: "no-store" }) => {
  try {
    // ScrapingAnt API URL Construction
    // browser=false (Fast & Cheap), agar block ho to future mein =true kar dena
    const targetUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${SCRAPING_ANT_TOKEN}&browser=false`;

    const res = await fetch(targetUrl, {
      ...options
    });

    if (!res.ok) {
        console.error(`ScrapingAnt Error: ${res.status}`);
        return null;
    }

    const textData = await res.text();

    // Kabhi kabhi ScrapingAnt JSON return karta hai content ke saath
    try {
        // Agar response JSON format mein hai to 'content' property nikalo
        if (textData.trim().startsWith("{") && textData.trim().endsWith("}")) {
            const json = JSON.parse(textData);
            // Agar API ne HTML 'content' field mein bheja hai
            if (json.content) return json.content;
            // Agar API ne error bheja hai
            if (json.error) console.error("API Error:", json.error);
        }
    } catch (e) {
        // Ignore JSON parse error, assume it's raw HTML
    }

    return textData; // Return Raw HTML

  } catch (error) {
    console.error("Fetch Failed:", error);
    return null;
  }
};
