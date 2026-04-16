// /api/shopify-auth.js
// Vercel serverless function — handles Shopify OAuth redirect
//
// SETUP:
// 1. Go to partners.shopify.com and create an app
// 2. Set the redirect URL to: https://your-vercel-url.vercel.app/api/shopify-callback
// 3. Add these as Vercel environment variables:
//    SHOPIFY_API_KEY=your_api_key
//    SHOPIFY_API_SECRET=your_api_secret
//    APP_URL=https://your-vercel-url.vercel.app

export default function handler(req, res) {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter. Use ?shop=yourstore.myshopify.com" });
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const redirectUri = `${appUrl}/api/shopify-callback`;
  const scopes = "read_products,read_orders,read_inventory,read_analytics";
  const nonce = Math.random().toString(36).slice(2);

  // Store nonce in cookie for verification
  res.setHeader("Set-Cookie", `shopify_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Secure`);

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

  res.redirect(302, authUrl);
}
