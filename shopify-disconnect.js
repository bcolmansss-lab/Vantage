// /api/shopify-disconnect.js
// Clears the Shopify connection

export default function handler(req, res) {
  res.setHeader("Set-Cookie", [
    "shopify_token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0",
    "shopify_shop=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0"
  ]);
  res.json({ disconnected: true });
}
