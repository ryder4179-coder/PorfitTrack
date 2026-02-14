import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const body = await readBody(event);

  const {
    product_id,
    listing_id,
    ebay_order_id,
    sale_price,
    supplier_cost,
    ebay_fees = 0,
    shipping_cost = 0,
    buyer_name = "",
    shipping_address = "",
    order_status = "new",
  } = body;

  if (!sale_price) {
    throw createError({ statusCode: 400, message: "sale_price is required" });
  }

  const net_profit = (
    parseFloat(sale_price) -
    parseFloat(supplier_cost || 0) -
    parseFloat(ebay_fees) -
    parseFloat(shipping_cost)
  ).toFixed(2);

  const result = await sql(
    `INSERT INTO orders (product_id, listing_id, ebay_order_id, sale_price, supplier_cost, ebay_fees, shipping_cost, net_profit, buyer_name, shipping_address, order_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [product_id || null, listing_id || null, ebay_order_id || null, sale_price, supplier_cost || 0, ebay_fees, shipping_cost, net_profit, buyer_name, shipping_address, order_status]
  );

  // Update product stats
  if (product_id) {
    await sql(
      `UPDATE products SET orders_count = orders_count + 1, total_profit = total_profit + $1, updated_at = NOW() WHERE id = $2`,
      [net_profit, product_id]
    );
  }

  return { order: result[0] };
});
