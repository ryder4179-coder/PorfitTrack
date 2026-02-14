import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const id = getRouterParam(event, "id");

  const products = await sql("SELECT * FROM products WHERE id = $1", [id]);

  if (!products.length) {
    throw createError({ statusCode: 404, message: "Product not found" });
  }

  return { product: products[0] };
});
