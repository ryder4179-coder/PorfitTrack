import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const body = await readBody(event);

  const { product_id, listing_title, listing_description, listing_price, ebay_category_id = "" } = body;

  if (!product_id || !listing_title || !listing_price) {
    throw createError({
      statusCode: 400,
      message: "product_id, listing_title, and listing_price are required",
    });
  }

  const result = await sql(
    `INSERT INTO listings (product_id, listing_title, listing_description, listing_price, listing_status, ebay_category_id)
     VALUES ($1, $2, $3, $4, 'draft', $5)
     RETURNING *`,
    [product_id, listing_title, listing_description || "", listing_price, ebay_category_id]
  );

  return { listing: result[0] };
});
