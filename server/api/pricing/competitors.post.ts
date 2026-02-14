import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const body = await readBody(event);

  const { product_id, competitor_name, competitor_price, competitor_url = "" } = body;

  if (!product_id || !competitor_price) {
    throw createError({
      statusCode: 400,
      message: "product_id and competitor_price are required",
    });
  }

  const result = await sql(
    `INSERT INTO competitor_prices (product_id, competitor_name, competitor_price, competitor_url)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [product_id, competitor_name || "", competitor_price, competitor_url]
  );

  return { competitor: result[0] };
});
