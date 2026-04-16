module.exports = function handler(req, res) {
  var shop = req.query.shop;
  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter" });
  }
  var apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "SHOPIFY_API_KEY not configured. Add it in Vercel Environment Variables." });
  }
  var appUrl = process.env.APP_URL || ("https://" + req.headers.host);
  var redirectUri = appUrl + "/api/shopify-callback";
  var scopes = "read_products,read_orders,read_inventory";
  var nonce = Math.random().toString(36).slice(2);
  res.setHeader("Set-Cookie", "shopify_nonce=" + nonce + "; Path=/; HttpOnly; SameSite=Lax; Secure");
  var authUrl = "https://" + shop + "/admin/oauth/authorize?client_id=" + apiKey + "&scope=" + scopes + "&redirect_uri=" + encodeURIComponent(redirectUri) + "&state=" + nonce;
  res.redirect(302, authUrl);
};
