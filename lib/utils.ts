import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as cheerio from "cheerio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ BACK TO MOVIES4U
export const PROXY_BASE = "https://proxy2.vlyx.workers.dev/?url=";
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
  } catch (e) { return str; }
};

export const parseHTML = (html: string) => {
  return cheerio.load(html);
};

// 🔥 UNIVERSAL FETCHER (Stable)
export const fetchProxy = async (url: string, options: any = { cache: "no-store" }) => {
  try {
    const targetUrl = `${PROXY_BASE}${encodeURIComponent(url)}`;
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) throw new Error(`Proxy Error: ${res.status}`);

    const contentType = res.headers.get("content-type");
    const textData = await res.text();

    if (contentType && contentType.includes("application/json")) {
        try {
            const json = JSON.parse(textData);
            return json.html || json.data || textData;
        } catch (e) { return textData; }
    }
    
    if (textData.trim().startsWith("{") && textData.trim().endsWith("}")) {
        try {
            const json = JSON.parse(textData);
            if (json.html) return json.html;
        } catch (e) {}
    }

    return textData;
  } catch (error) {
    console.error("Scraping Failed:", error);
    return null;
  }
};
