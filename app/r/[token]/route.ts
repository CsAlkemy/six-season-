import { NextResponse } from "next/server";

import { openReset, RESET_COOKIE } from "@/lib/customers";
import { STORE_LANG } from "@/lib/types";

/**
 * A password reset link: /r/<token>, short enough for WhatsApp. The token goes into a short-lived cookie and the visitor
 * lands on the account page's "choose a new password" form; it never sits in a page address, which analytics would see.
 */
export async function GET(request: Request, ctx: RouteContext<"/r/[token]">) {
  const { token } = await ctx.params;
  const reset = await openReset(token).catch(() => null);
  const lang = reset?.lang ?? STORE_LANG;
  if (!reset) return NextResponse.redirect(new URL(`/account?reset=expired`, request.url), 303);
  const response = NextResponse.redirect(new URL(`/account?reset=1`, request.url), 303);
  response.cookies.set(RESET_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.floor((reset.expires - Date.now()) / 1000)),
  });
  // A reset link must never be cached or prefetched into someone else's hands.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
