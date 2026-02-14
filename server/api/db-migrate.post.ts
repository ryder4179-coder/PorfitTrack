import { getDb } from "../utils/db";

export default defineEventHandler(async () => {
  const sql = getDb();

  await sql(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_name TEXT NOT NULL,
      sku TEXT UNIQUE,
      supplier_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      target_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 30,
      calculated_sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_urls TEXT[] DEFAULT '{}',
      supplier_url TEXT DEFAULT '',
      orders_count INTEGER DEFAULT 0,
      returns_count INTEGER DEFAULT 0,
      total_profit NUMERIC(10,2) DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS listings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      ebay_item_id TEXT,
      listing_title TEXT NOT NULL,
      listing_description TEXT DEFAULT '',
      listing_price NUMERIC(10,2) NOT NULL,
      listing_status TEXT DEFAULT 'draft',
      ebay_category_id TEXT DEFAULT '',
      listed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
      ebay_order_id TEXT,
      sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      supplier_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      ebay_fees NUMERIC(10,2) DEFAULT 0,
      shipping_cost NUMERIC(10,2) DEFAULT 0,
      net_profit NUMERIC(10,2) DEFAULT 0,
      buyer_name TEXT DEFAULT '',
      shipping_address TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      order_status TEXT DEFAULT 'new',
      ordered_at TIMESTAMPTZ DEFAULT NOW(),
      shipped_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS competitor_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      competitor_name TEXT DEFAULT '',
      competitor_price NUMERIC(10,2) NOT NULL,
      competitor_url TEXT DEFAULT '',
      checked_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      min_margin_percent NUMERIC(5,2) DEFAULT 10,
      max_price_limit NUMERIC(10,2) DEFAULT 999.99,
      auto_undercut_amount NUMERIC(10,2) DEFAULT 0.50,
      auto_pricing_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_revenue NUMERIC(10,2) DEFAULT 0,
      net_profit NUMERIC(10,2) DEFAULT 0,
      active_listings INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      total_returns INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  return { success: true, message: "Database tables created successfully" };
});
