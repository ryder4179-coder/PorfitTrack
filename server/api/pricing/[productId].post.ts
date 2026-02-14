import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const product_id = getRouterParam(event, "productId");
  const body = await readBody(event);

  const {
    min_margin_percent = 10,
    max_price_limit = 999.99,
    auto_undercut_amount = 0.5,
    auto_pricing_enabled = false,
  } = body;

  // Upsert pricing rules
  const existing = await sql(
    `SELECT id FROM pricing_rules WHERE product_id = $1`,
    [product_id]
  );

  let result;
  if (existing.length) {
    result = await sql(
      `UPDATE pricing_rules SET min_margin_percent = $1, max_price_limit = $2, auto_undercut_amount = $3, auto_pricing_enabled = $4, updated_at = NOW()
       WHERE product_id = $5 RETURNING *`,
      [min_margin_percent, max_price_limit, auto_undercut_amount, auto_pricing_enabled, product_id]
    );
  } else {
    result = await sql(
      `INSERT INTO pricing_rules (product_id, min_margin_percent, max_price_limit, auto_undercut_amount, auto_pricing_enabled)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product_id, min_margin_percent, max_price_limit, auto_undercut_amount, auto_pricing_enabled]
    );
  }

  return { rules: result[0] };
});
