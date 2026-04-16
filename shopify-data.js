// /api/shopify-data.js
// Fetches products, orders, and financial data from connected Shopify store

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const cookies = req.headers.cookie || "";
  const tokenCookie = cookies.split(";").find(c => c.trim().startsWith("shopify_token="));
  const shopCookie = cookies.split(";").find(c => c.trim().startsWith("shopify_shop="));

  const token = tokenCookie ? tokenCookie.split("=")[1].trim() : null;
  const shop = shopCookie ? shopCookie.split("=")[1].trim() : null;

  if (!token || !shop) {
    return res.status(401).json({ error: "Not connected to Shopify", connected: false });
  }

  const headers = {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json"
  };

  try {
    // Fetch products
    const productsRes = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=50`, { headers });
    const productsData = await productsRes.json();

    // Fetch recent orders (last 90 days)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const ordersRes = await fetch(`https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${since}&limit=250`, { headers });
    const ordersData = await ordersRes.json();

    // Fetch inventory levels
    const locationsRes = await fetch(`https://${shop}/admin/api/2024-01/locations.json`, { headers });
    const locationsData = await locationsRes.json();

    // Process products into Vantage format
    const products = (productsData.products || []).map(p => {
      const variant = p.variants && p.variants[0] ? p.variants[0] : {};
      const price = parseFloat(variant.price) || 0;
      const cost = parseFloat(variant.cost) || 0;

      // Calculate monthly sales from orders
      const productOrders = (ordersData.orders || []).filter(o =>
        o.line_items && o.line_items.some(li => li.product_id === p.id)
      );
      const totalUnits = productOrders.reduce((sum, o) => {
        return sum + o.line_items
          .filter(li => li.product_id === p.id)
          .reduce((s, li) => s + li.quantity, 0);
      }, 0);
      const monthlySales = Math.round(totalUnits / 3); // 90 days -> monthly avg

      return {
        shopifyId: p.id,
        name: p.title,
        price: price,
        raw: cost * 0.5,      // Estimate: 50% of cost is raw material
        pack: cost * 0.15,     // 15% packaging
        ship: cost * 0.2,      // 20% shipping
        labor: cost * 0.1,     // 10% labor
        other: cost * 0.05,    // 5% other
        sales: monthlySales,
        growth: 0,
        stock: parseInt(variant.inventory_quantity) || 0,
        reorder: Math.round(monthlySales * 0.5),
        lead: 14,
        channel: "DTC",
        image: p.image ? p.image.src : null
      };
    });

    // Calculate revenue summary
    const totalRevenue = (ordersData.orders || []).reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const totalOrders = (ordersData.orders || []).length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      connected: true,
      shop: shop,
      products: products,
      summary: {
        totalRevenue90d: totalRevenue,
        monthlyRevenue: Math.round(totalRevenue / 3),
        totalOrders90d: totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        productCount: products.length
      },
      lastSync: new Date().toISOString()
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Shopify data", message: err.message });
  }
}
