// /api/shopify-callback.js
// Handles the OAuth callback from Shopify, exchanges code for access token

export default async function handler(req, res) {
  const { code, shop, state } = req.query;

  if (!code || !shop) {
    return res.status(400).json({ error: "Missing code or shop" });
  }

  // Verify nonce
  const cookies = req.headers.cookie || "";
  const nonceCookie = cookies.split(";").find(c => c.trim().startsWith("shopify_nonce="));
  const savedNonce = nonceCookie ? nonceCookie.split("=")[1] : null;

  if (state !== savedNonce) {
    return res.status(403).json({ error: "Invalid state parameter" });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code: code
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Failed to get access token", details: tokenData });
    }

    // Store token in a secure cookie (in production, use a database)
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    res.setHeader("Set-Cookie", [
      `shopify_token=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`,
      `shopify_shop=${shop}; Path=/; SameSite=Lax; Secure; Max-Age=86400`
    ]);

    // Redirect back to app with success flag
    res.redirect(302, `${appUrl}/?shopify=connected&shop=${encodeURIComponent(shop)}`);

  } catch (err) {
    res.status(500).json({ error: "OAuth failed", message: err.message });
  }
}
