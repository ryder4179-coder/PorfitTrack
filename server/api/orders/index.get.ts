import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const query = getQuery(event);
  const status = query.status as string | undefined;

  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (status) {
    whereClause += ` AND o.order_status = $1`;
    params.push(status);
  }

  const orders = await sql(
    `SELECT o.*, p.product_name, p.sku, p.supplier_url
     FROM orders o
     LEFT JOIN products p ON o.product_id = p.id
     ${whereClause}
     ORDER BY o.created_at DESC`,
    params
  );

  return { orders };
});
