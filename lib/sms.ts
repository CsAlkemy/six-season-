/** BulkSMSBD (bulksmsbd.net). Without keys, development prints the message to the terminal instead. */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;
  if (!apiKey || !senderId) {
    if (process.env.NODE_ENV === "production") return false;
    console.log(`[sms → ${phone}] ${message}`);
    return true;
  }
  try {
    const res = await fetch("https://bulksmsbd.net/api/smsapi", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: apiKey, senderid: senderId, number: `88${phone}`, message, type: "text" }),
    });
    const data = (await res.json().catch(() => null)) as { response_code?: number } | null;
    if (data?.response_code === 202) return true;
    console.error("sendSms", res.status, data);
  } catch (error) {
    console.error("sendSms", error);
  }
  return false;
}
