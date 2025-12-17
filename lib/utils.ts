import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as cheerio from "cheerio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ PROXY LIST (Agar ek fail ho to doosra use karein)
export const PROXY_BASE = "https://proxy2.vlyx.workers.dev/?url=";
export const SOURCE_DOMAIN = "https://movies4u.nexus"; 

// Base64 Helpers
export const encodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

export const decodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str, "base64").toString("utf-8");
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

export const parseHTML = (html: string) => {
  return cheerio.load(html);
};

// 🔥 SMART FETCHER (Cloudflare Bypass Logic)
export const fetchProxy = async (url: string, revalidate = 0) => {
  try {
    const targetUrl = `${PROXY_BASE}${encodeURIComponent(url)}`;
    
    // 1. Try Normal Proxy
    let res = await fetch(targetUrl, {
      next: { revalidate },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    let textData = await res.text();

    // Check if Cloudflare Blocked it (Just a moment... / 522 / 403)
    const isBlocked = textData.includes("Just a moment...") || textData.includes("Enable JavaScript") || res.status === 522 || res.status === 403;

    // 🚀 2. IF BLOCKED: Try Google Cache (The Jugaad)
    if (isBlocked || !res.ok) {
        console.log("⚠️ Cloudflare Blocked! Switching to Google Cache...");
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${url}&strip=1&vwsrc=0`;
        
        // Google Cache ko fetch karne ke liye bhi Proxy use karenge
        const cacheRes = await fetch(`${PROXY_BASE}${encodeURIComponent(cacheUrl)}`, { cache: "no-store" });
        if (cacheRes.ok) {
            textData = await cacheRes.text();
            // Google Header clean karo
            textData = textData.replace(/<base href=".*?">/, ""); 
        }
    }

    // 3. JSON vs HTML Handling
    if (textData.trim().startsWith("{") && textData.trim().endsWith("}")) {
        try {
            const json = JSON.parse(textData);
            return json.html || json.data || textData;
        } catch (e) {}
    }

    return textData;

  } catch (error) {
    console.error("Scraping Failed:", error);
    return null;
  }
};
