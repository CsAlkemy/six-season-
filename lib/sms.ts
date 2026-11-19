/**
 * Text messages through BulkSMSBD (bulksmsbd.net), off until SMS_API_KEY and SMS_SENDER_ID are both set. While they're
 * off nothing is sent: guests check out without a code, accounts log in with their password, and buyers find an order
 * by its number and their mobile. Setting the keys brings codes back at checkout, code login and signup.
 */
export const smsEnabled = () => Boolean(process.env.SMS_API_KEY?.trim() && process.env.SMS_SENDER_ID?.trim());

export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!smsEnabled()) return false;
  try {
    const res = await fetch("https://bulksmsbd.net/api/smsapi", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: process.env.SMS_API_KEY!.trim(), senderid: process.env.SMS_SENDER_ID!.trim(), number: `88${phone}`, message, type: "text" }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { response_code?: number } | null;
    if (data?.response_code === 202) return true;
    console.error("sendSms", res.status, data);
  } catch (error) {
    console.error("sendSms", error);
  }
  return false;
}
