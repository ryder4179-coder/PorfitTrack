import { getDb } from "../../utils/db";

export default defineEventHandler(async () => {
  const sql = getDb();

  // Total revenue and profit
  const revenueResult = await sql(
    `SELECT COALESCE(SUM(sale_price), 0) as total_revenue, COALESCE(SUM(net_profit), 0) as net_profit, COUNT(*) as total_orders
     FROM orders`
  );

  // Active listings
  const listingsResult = await sql(
    `SELECT COUNT(*) as active_listings FROM listings WHERE listing_status = 'active'`
  );

  // Total listings (for sell-through)
  const totalListingsResult = await sql(
    `SELECT COUNT(*) as total_listings FROM listings`
  );

  // Returns
  const returnsResult = await sql(
    `SELECT COALESCE(SUM(returns_count), 0) as total_returns FROM products`
  );

  // Revenue by day (last 30 days)
  const dailyRevenue = await sql(
    `SELECT DATE(ordered_at) as date, SUM(sale_price) as revenue, SUM(net_profit) as profit, COUNT(*) as orders
     FROM orders
     WHERE ordered_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(ordered_at)
     ORDER BY date`
  );

  // Profit by category
  const categoryProfit = await sql(
    `SELECT p.category, SUM(o.net_profit) as profit, COUNT(o.id) as orders
     FROM orders o
     JOIN products p ON o.product_id = p.id
     WHERE p.category != ''
     GROUP BY p.category
     ORDER BY profit DESC`
  );

  // Top products
  const topProducts = await sql(
    `SELECT product_name, orders_count, total_profit
     FROM products
     WHERE orders_count > 0
     ORDER BY total_profit DESC
     LIMIT 10`
  );

  // Worst products
  const worstProducts = await sql(
    `SELECT product_name, orders_count, total_profit, returns_count
     FROM products
     WHERE orders_count > 0
     ORDER BY total_profit ASC
     LIMIT 10`
  );

  const totalOrders = parseInt(revenueResult[0].total_orders);
  const totalListings = parseInt(totalListingsResult[0].total_listings);
  const sellThroughRate = totalListings > 0 ? ((totalOrders / totalListings) * 100).toFixed(1) : "0";
  const returnRate = totalOrders > 0
    ? ((parseInt(returnsResult[0].total_returns) / totalOrders) * 100).toFixed(1)
    : "0";

  return {
    summary: {
      total_revenue: parseFloat(revenueResult[0].total_revenue),
      net_profit: parseFloat(revenueResult[0].net_profit),
      total_orders: totalOrders,
      active_listings: parseInt(listingsResult[0].active_listings),
      sell_through_rate: parseFloat(sellThroughRate),
      return_rate: parseFloat(returnRate),
    },
    daily_revenue: dailyRevenue,
    category_profit: categoryProfit,
    top_products: topProducts,
    worst_products: worstProducts,
  };
});
