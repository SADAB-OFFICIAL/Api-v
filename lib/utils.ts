import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as cheerio from "cheerio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ CONFIGURATION
// Nayi Website: moviesdrive.pics
export const PROXY_BASE = "https://proxy2.vlyx.workers.dev/?url=";
export const SOURCE_DOMAIN = "https://moviesdrive.pics"; 

// Base64 Helpers (Encoding/Decoding ke liye)
export const encodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

export const decodeBase64 = (str: string) => {
  if (typeof window === "undefined") return Buffer.from(str, "base64").toString("utf-8");
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

// HTML Parser (Cheerio)
export const parseHTML = (html: string) => {
  return cheerio.load(html);
};

// 🔥 UNIVERSAL FETCHER (Smart Logic)
// Ye check karega ki Proxy ne JSON diya hai ya HTML, aur us hisaab se data return karega.
export const fetchProxy = async (url: string, options: any = { cache: "no-store" }) => {
  try {
    // URL construct karo
    const targetUrl = `${PROXY_BASE}${url}`;

    const res = await fetch(targetUrl, {
      ...options,
