import { getDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const sql = getDb();
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const { order_status, tracking_number } = body;

  const setClauses: string[] = ["updated_at = NOW()"];
  const params: any[] = [];
  let idx = 1;

  if (order_status) {
    setClauses.push(`order_status = $${idx}`);
    params.push(order_status);
    idx++;

    if (order_status === "shipped") {
      setClauses.push(`shipped_at = NOW()`);
    } else if (order_status === "delivered") {
      setClauses.push(`delivered_at = NOW()`);
    }
  }

  if (tracking_number) {
    setClauses.push(`tracking_number = $${idx}`);
    params.push(tracking_number);
    idx++;
  }

  params.push(id);

  const result = await sql(
    `UPDATE orders SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );

  if (!result.length) {
    throw createError({ statusCode: 404, message: "Order not found" });
  }

  return { order: result[0] };
});
