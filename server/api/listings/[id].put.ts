import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const { listing_title, listing_description, listing_price, listing_status, ebay_item_id, ebay_category_id } = body;

  const setClauses: string[] = ["updated_at = NOW()"];
  const params: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    listing_title,
    listing_description,
    listing_price,
    listing_status,
    ebay_item_id,
    ebay_category_id,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (listing_status === "active") {
    setClauses.push(`listed_at = NOW()`);
  }

  params.push(id);

  const result = await sql(
    `UPDATE listings SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );

  if (!result.length) {
    throw createError({ statusCode: 404, message: "Listing not found" });
  }

  return { listing: result[0] };
});
