import type { Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request) => {
  const sql = neon();

  try {
    const body = await req.json();

    // Extract order data from eBay webhook payload
    // eBay sends different notification types; handle order completion
    const notification = body;

    // Handle eBay marketplace account deletion notifications (required by eBay)
    if (notification?.metadata?.topic === "MARKETPLACE_ACCOUNT_DELETION") {
      console.log("Account deletion notification received");
      return new Response(JSON.stringify({ status: "acknowledged" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process order notification
    const orderData = notification?.resource || notification;
    if (!orderData) {
      return new Response(JSON.stringify({ error: "No order data" }), { status: 400 });
    }

    const ebayOrderId = orderData.orderId || orderData.order_id || "";
    const buyerName = orderData.buyer?.username || orderData.buyerName || "";
    const shippingAddress = orderData.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.fullName || "";

    // Try to match with existing product by eBay item ID
    const lineItems = orderData.lineItems || [];
    let totalSalePrice = 0;
    let matchedProductId = null;
    let matchedListingId = null;

    for (const item of lineItems) {
      const ebayItemId = item.legacyItemId || item.itemId || "";
      totalSalePrice += parseFloat(item.total?.value || item.price || 0);

      if (ebayItemId) {
        const listings = await sql(
          `SELECT l.id, l.product_id, p.supplier_cost
           FROM listings l
           JOIN products p ON l.product_id = p.id
           WHERE l.ebay_item_id = $1
           LIMIT 1`,
          [ebayItemId]
        );

        if (listings.length) {
          matchedProductId = listings[0].product_id;
          matchedListingId = listings[0].id;
        }
      }
    }

    // Calculate fees (eBay typically charges ~12.9% + $0.30)
    const estimatedFees = (totalSalePrice * 0.129 + 0.3).toFixed(2);

    // Get supplier cost if we matched a product
    let supplierCost = 0;
    if (matchedProductId) {
      const products = await sql(
        `SELECT supplier_cost FROM products WHERE id = $1`,
        [matchedProductId]
      );
      if (products.length) {
        supplierCost = parseFloat(products[0].supplier_cost);
      }
    }

    const netProfit = (
      totalSalePrice - supplierCost - parseFloat(estimatedFees)
    ).toFixed(2);

    // Save order to database
    await sql(
      `INSERT INTO orders (product_id, listing_id, ebay_order_id, sale_price, supplier_cost, ebay_fees, net_profit, buyer_name, shipping_address, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new')`,
      [matchedProductId, matchedListingId, ebayOrderId, totalSalePrice, supplierCost, estimatedFees, netProfit, buyerName, shippingAddress]
    );

    // Update product stats if matched
    if (matchedProductId) {
      await sql(
        `UPDATE products SET orders_count = orders_count + 1, total_profit = total_profit + $1, updated_at = NOW() WHERE id = $2`,
        [netProfit, matchedProductId]
      );
    }

    console.log(`New order received: ${ebayOrderId}, Profit: $${netProfit}`);

    return new Response(JSON.stringify({ status: "ok", order_id: ebayOrderId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/webhooks/ebay-order",
};
