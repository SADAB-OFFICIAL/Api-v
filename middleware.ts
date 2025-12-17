import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Response object banao
  const res = NextResponse.next();

  // CORS Headers set karo (Taaki koi bhi isse access kar sake)
  res.headers.append('Access-Control-Allow-Credentials', "true");
  res.headers.append('Access-Control-Allow-Origin', '*'); // '*' ka matlab sabko allow karo
  res.headers.append('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.headers.append(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return res;
}

// Ye middleware sirf API routes par chalega
export const config = {
  matcher: '/api/:path*',
};
