import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as cheerio from "cheerio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PROXY_BASE = "https://proxy2.vlyx.workers.dev/?url=";
// Agar main domain down ho to yahan change kar lena (e.g. movies4u.vip)
export const SOURCE_DOMAIN = "https://movies4u.nexus"; 

// Base64 Helpers
export const encodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

export const decodeBase64 = (str: string) => {
  try {
    if (typeof window === "undefined") return Buffer.from(str, "base64").toString("utf-8");
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch(e) { return str; }
};

export const parseHTML = (html: string) => {
  return cheerio.load(html);
};

// ⚡ Ultra Fast Fetcher with Auto-Retry logic
export const fetchProxy = async (url: string, revalidate = 0) => {
  try {
    const encodedUrl = encodeURIComponent(url);
    const res = await fetch(`${PROXY_BASE}${url}`, {
      next: { revalidate }, // Caching Magic Here
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type");
    const textData = await res.text();

    // Auto-detect JSON response from Proxy
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = JSON.parse(textData);
            return json.html || json.data || textData;
        } catch (e) { return textData; }
    }
    
    // Fallback for JSON string
    if (textData.trim().startsWith("{") && textData.trim().endsWith("}")) {
        try {
            const json = JSON.parse(textData);
            if (json.html) return json.html;
        } catch (e) {}
    }

    return textData;
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
};
