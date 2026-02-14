import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const body = await readBody(event);

  const {
    product_name,
    sku,
    supplier_cost,
    target_markup_percent = 30,
    category = "",
    description = "",
    image_urls = [],
    supplier_url = "",
    notes = "",
  } = body;

  if (!product_name || supplier_cost === undefined) {
    throw createError({
      statusCode: 400,
      message: "product_name and supplier_cost are required",
    });
  }

  const cost = parseFloat(supplier_cost);
  const markup = parseFloat(target_markup_percent);
  const calculated_sale_price = (cost * (1 + markup / 100)).toFixed(2);

  const result = await sql(
    `INSERT INTO products (product_name, sku, supplier_cost, target_markup_percent, calculated_sale_price, category, description, image_urls, supplier_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [product_name, sku || null, cost, markup, calculated_sale_price, category, description, image_urls, supplier_url, notes]
  );

  return { product: result[0] };
});
