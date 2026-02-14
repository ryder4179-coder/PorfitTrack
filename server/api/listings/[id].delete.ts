import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const id = getRouterParam(event, "id");

  const result = await sql("DELETE FROM listings WHERE id = $1 RETURNING id", [id]);

  if (!result.length) {
    throw createError({ statusCode: 404, message: "Listing not found" });
  }

  return { success: true };
});
