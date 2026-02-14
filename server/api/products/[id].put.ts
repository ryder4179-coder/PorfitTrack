import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const {
    product_name,
    sku,
    supplier_cost,
    target_markup_percent,
    category,
    description,
    image_urls,
    supplier_url,
    notes,
  } = body;

  const cost = supplier_cost !== undefined ? parseFloat(supplier_cost) : undefined;
  const markup = target_markup_percent !== undefined ? parseFloat(target_markup_percent) : undefined;

  let calculated_sale_price: string | undefined;
  if (cost !== undefined && markup !== undefined) {
    calculated_sale_price = (cost * (1 + markup / 100)).toFixed(2);
  } else if (cost !== undefined) {
    // Fetch current markup to recalculate
    const existing = await sql("SELECT target_markup_percent FROM products WHERE id = $1", [id]);
    if (existing.length) {
      calculated_sale_price = (cost * (1 + parseFloat(existing[0].target_markup_percent) / 100)).toFixed(2);
    }
  } else if (markup !== undefined) {
    const existing = await sql("SELECT supplier_cost FROM products WHERE id = $1", [id]);
    if (existing.length) {
      calculated_sale_price = (parseFloat(existing[0].supplier_cost) * (1 + markup / 100)).toFixed(2);
    }
  }

  const setClauses: string[] = [];
  const params: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    product_name,
    sku,
    supplier_cost: cost,
    target_markup_percent: markup,
    calculated_sale_price,
    category,
    description,
    image_urls,
    supplier_url,
    notes,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (!setClauses.length) {
    throw createError({ statusCode: 400, message: "No fields to update" });
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const result = await sql(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );

  if (!result.length) {
    throw createError({ statusCode: 404, message: "Product not found" });
  }

  return { product: result[0] };
});
