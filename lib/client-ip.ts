import { BlockList, isIPv6 } from "node:net";

/**
 * Cloudflare's own addresses (cloudflare.com/ips, November 2026). When the domain is proxied through Cloudflare
 * (orange cloud), Vercel sees one of these as the visitor, because it replaces x-forwarded-for with whoever connected
 * to it. The shopper's real address is then in CF-Connecting-IP, which Cloudflare sets and a shopper can't.
 */
const CLOUDFLARE = new BlockList();
for (const range of [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
  "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
]) {
  const [net, bits] = range.split("/");
  CLOUDFLARE.addSubnet(net!, Number(bits), isIPv6(net!) ? "ipv6" : "ipv4");
}

const fromCloudflare = (ip: string) => {
  try {
    return CLOUDFLARE.check(ip, isIPv6(ip) ? "ipv6" : "ipv4");
  } catch {
    return false;
  }
};

/**
 * The visitor's address, as rate limits should count it. Vercel's x-forwarded-for is whoever connected to Vercel:
 * the shopper, or a Cloudflare server when Cloudflare sits in front. Only in that second case is CF-Connecting-IP
 * believed; sent by anyone else (straight to the .vercel.app address), it's ignored, so it can't dodge a limit.
 */
export function visitorIp(h: Headers): string {
  const connected = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const behind = h.get("cf-connecting-ip")?.trim();
  if (connected && behind && fromCloudflare(connected)) return behind;
  return connected || "unknown";
}
