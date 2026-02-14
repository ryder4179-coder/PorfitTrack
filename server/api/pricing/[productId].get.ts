import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const product_id = getRouterParam(event, "productId");

  const rules = await sql(
    `SELECT * FROM pricing_rules WHERE product_id = $1`,
    [product_id]
  );

  const competitors = await sql(
    `SELECT * FROM competitor_prices WHERE product_id = $1 ORDER BY checked_at DESC`,
    [product_id]
  );

  return { rules: rules[0] || null, competitors };
});
