var https = require("https");

module.exports = function handler(req, res) {
  var code = req.query.code;
  var shop = req.query.shop;
  var state = req.query.state;
  if (!code || !shop) {
    return res.status(400).json({ error: "Missing code or shop" });
  }
  var postData = JSON.stringify({
    client_id: process.env.SHOPIFY_API_KEY,
    client_secret: process.env.SHOPIFY_API_SECRET,
    code: code
  });
  var options = {
    hostname: shop,
    path: "/admin/oauth/access_token",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) }
  };
  var request = https.request(options, function(response) {
    var body = "";
    response.on("data", function(chunk) { body += chunk; });
    response.on("end", function() {
      try {
        var data = JSON.parse(body);
        if (!data.access_token) {
          return res.status(400).json({ error: "No access token", details: data });
        }
        var appUrl = process.env.APP_URL || ("https://" + req.headers.host);
        res.setHeader("Set-Cookie", [
          "shopify_token=" + data.access_token + "; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400",
          "shopify_shop=" + shop + "; Path=/; SameSite=Lax; Secure; Max-Age=86400"
        ]);
        res.redirect(302, appUrl + "/?shopify=connected&shop=" + encodeURIComponent(shop));
      } catch(e) {
        res.status(500).json({ error: "Parse error", message: e.message });
      }
    });
  });
  request.on("error", function(e) {
    res.status(500).json({ error: "Request failed", message: e.message });
  });
  request.write(postData);
  request.end();
};
