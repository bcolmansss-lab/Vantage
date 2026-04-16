# Vantage — AI CFO Platform
## Deployment with Shopify Integration

### Quick Deploy to Vercel

1. Push this folder to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Add environment variables (Settings → Environment Variables):
   - `SHOPIFY_API_KEY` — from your Shopify Partners app
   - `SHOPIFY_API_SECRET` — from your Shopify Partners app  
   - `APP_URL` — your Vercel URL (e.g. https://vantage-xyz.vercel.app)
4. Deploy

### Setting Up Shopify Integration

1. Go to partners.shopify.com
2. Create a new app (or use an existing one)
3. Under "App setup":
   - Set Redirect URL to: `https://YOUR-VERCEL-URL/api/shopify-callback`
   - Request scopes: `read_products, read_orders, read_inventory, read_analytics`
4. Copy the API Key and API Secret
5. Add them as Vercel environment variables (step 3 above)
6. Redeploy

### How It Works

- User clicks "Connect Shopify" in the Integrations tab
- Enters their store URL (e.g. mystore.myshopify.com)
- Gets redirected to Shopify OAuth approval screen
- Shopify sends back a token to /api/shopify-callback
- Token is stored in a secure cookie
- /api/shopify-data pulls products, orders, inventory
- Data is imported into the Vantage dashboard automatically

### What Gets Imported

- **Products**: name, price, variants, images
- **COGS estimate**: splits cost into raw/packaging/shipping/labor/other
- **Monthly sales**: calculated from last 90 days of orders
- **Inventory**: current stock levels
- **Revenue**: total and monthly average from order history

### File Structure

```
vantage-deploy/
├── api/
│   ├── shopify-auth.js       # OAuth initiation
│   ├── shopify-callback.js   # OAuth token exchange  
│   ├── shopify-data.js       # Data fetching endpoint
│   └── shopify-disconnect.js # Clear connection
├── public/
│   └── index.html            # The full Vantage app
├── vercel.json               # Routing config
└── README.md
```

### For Whop

1. Deploy to Vercel (above)
2. Create a Whop product → type "Link"
3. Paste your Vercel URL
4. Set pricing (subscription recommended)

### Local Development

The HTML file works standalone (just open it in a browser).
Shopify integration only works when deployed to Vercel since it needs server-side OAuth.
