import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const query = getQuery(event);
  const status = query.status as string | undefined;

  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (status) {
    whereClause += ` AND l.listing_status = $1`;
    params.push(status);
  }

  const listings = await sql(
    `SELECT l.*, p.product_name, p.sku, p.supplier_cost, p.calculated_sale_price, p.image_urls
     FROM listings l
     LEFT JOIN products p ON l.product_id = p.id
     ${whereClause}
     ORDER BY l.created_at DESC`,
    params
  );

  return { listings };
});
