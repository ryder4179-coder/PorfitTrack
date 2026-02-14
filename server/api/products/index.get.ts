import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const query = getQuery(event);
  const category = query.category as string | undefined;
  const search = query.search as string | undefined;

  let whereClause = "WHERE 1=1";
  const params: any[] = [];
  let paramIdx = 1;

  if (category) {
    whereClause += ` AND category = $${paramIdx}`;
    params.push(category);
    paramIdx++;
  }

  if (search) {
    whereClause += ` AND (product_name ILIKE $${paramIdx} OR sku ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  const products = await sql(
    `SELECT * FROM products ${whereClause} ORDER BY created_at DESC`,
    params
  );

  return { products };
});
