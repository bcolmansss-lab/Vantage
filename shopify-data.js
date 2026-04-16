var https = require("https");

function shopifyGet(shop, token, path, callback) {
  var options = {
    hostname: shop,
    path: path,
    method: "GET",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" }
  };
  var request = https.request(options, function(response) {
    var body = "";
    response.on("data", function(chunk) { body += chunk; });
    response.on("end", function() {
      try { callback(null, JSON.parse(body)); } catch(e) { callback(e); }
    });
  });
  request.on("error", function(e) { callback(e); });
  request.end();
}

function parseCookies(cookieHeader) {
  var cookies = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach(function(c) {
      var parts = c.trim().split("=");
      if (parts.length >= 2) cookies[parts[0]] = parts.slice(1).join("=");
    });
  }
  return cookies;
}

module.exports = function handler(req, res) {
  var cookies = parseCookies(req.headers.cookie);
  var token = cookies.shopify_token;
  var shop = cookies.shopify_shop;
  if (!token || !shop) {
    return res.status(401).json({ error: "Not connected", connected: false });
  }
  shopifyGet(shop, token, "/admin/api/2024-01/products.json?limit=50", function(err, prodData) {
    if (err) return res.status(500).json({ error: err.message });
    var since = new Date(Date.now() - 90*24*60*60*1000).toISOString();
    shopifyGet(shop, token, "/admin/api/2024-01/orders.json?status=any&created_at_min=" + since + "&limit=250", function(err2, orderData) {
      if (err2) return res.status(500).json({ error: err2.message });
      var products = (prodData.products || []).map(function(p) {
        var v = p.variants && p.variants[0] ? p.variants[0] : {};
        var price = parseFloat(v.price) || 0;
        var cost = parseFloat(v.cost) || 0;
        var orders = (orderData.orders || []).filter(function(o) {
          return o.line_items && o.line_items.some(function(li) { return li.product_id === p.id; });
        });
        var totalUnits = orders.reduce(function(sum, o) {
          return sum + o.line_items.filter(function(li) { return li.product_id === p.id; }).reduce(function(s, li) { return s + li.quantity; }, 0);
        }, 0);
        return {
          shopifyId: p.id, name: p.title, price: price,
          raw: Math.round(cost*50)/100, pack: Math.round(cost*15)/100,
          ship: Math.round(cost*20)/100, labor: Math.round(cost*10)/100,
          other: Math.round(cost*5)/100, sales: Math.round(totalUnits/3),
          growth: 0, stock: parseInt(v.inventory_quantity) || 0,
          reorder: Math.round(totalUnits/6), lead: 14, channel: "DTC"
        };
      });
      var totalRev = (orderData.orders || []).reduce(function(s,o) { return s + parseFloat(o.total_price||0); }, 0);
      var totalOrders = (orderData.orders || []).length;
      res.json({
        connected: true, shop: shop, products: products,
        summary: { totalRevenue90d: totalRev, monthlyRevenue: Math.round(totalRev/3), totalOrders90d: totalOrders, avgOrderValue: totalOrders>0?Math.round(totalRev/totalOrders*100)/100:0, productCount: products.length },
        lastSync: new Date().toISOString()
      });
    });
  });
};
