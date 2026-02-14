import type { Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request) => {
  const sql = neon();

  try {
    // Get all products with auto-pricing enabled
    const rules = await sql(
      `SELECT pr.*, p.supplier_cost, p.calculated_sale_price, p.product_name
       FROM pricing_rules pr
       JOIN products p ON pr.product_id = p.id
       WHERE pr.auto_pricing_enabled = true`
    );

    let updated = 0;

    for (const rule of rules) {
      // Get the lowest competitor price for this product
      const competitors = await sql(
        `SELECT MIN(competitor_price) as lowest_price
         FROM competitor_prices
         WHERE product_id = $1
         AND checked_at >= NOW() - INTERVAL '7 days'`,
        [rule.product_id]
      );

      if (!competitors.length || !competitors[0].lowest_price) continue;

      const lowestCompetitorPrice = parseFloat(competitors[0].lowest_price);
      const currentPrice = parseFloat(rule.calculated_sale_price);
      const supplierCost = parseFloat(rule.supplier_cost);
      const minMargin = parseFloat(rule.min_margin_percent);
      const maxPrice = parseFloat(rule.max_price_limit);
      const undercutAmount = parseFloat(rule.auto_undercut_amount);

      // Only adjust if competitor is lower
      if (lowestCompetitorPrice >= currentPrice) continue;

      const newPrice = lowestCompetitorPrice - undercutAmount;
      const minimumPrice = supplierCost * (1 + minMargin / 100);

      // Safety checks
      if (newPrice < minimumPrice) continue;
      if (newPrice > maxPrice) continue;
      if (newPrice <= 0) continue;

      // Update the product price
      await sql(
        `UPDATE products SET calculated_sale_price = $1, updated_at = NOW() WHERE id = $2`,
        [newPrice.toFixed(2), rule.product_id]
      );

      // Update active listings for this product
      await sql(
        `UPDATE listings SET listing_price = $1, updated_at = NOW()
         WHERE product_id = $2 AND listing_status = 'active'`,
        [newPrice.toFixed(2), rule.product_id]
      );

      updated++;
      console.log(`Updated ${rule.product_name} from $${currentPrice} to $${newPrice.toFixed(2)}`);
    }

    console.log(`Auto-pricing complete. Updated ${updated} products.`);
  } catch (error) {
    console.error("Auto-pricing error:", error);
  }
};

export const config: Config = {
  schedule: "0 */6 * * *",
};
