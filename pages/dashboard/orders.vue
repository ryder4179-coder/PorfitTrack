<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { data: ordersData, refresh: refreshOrders } = useFetch("/api/orders");
const { data: productsData } = useFetch("/api/products");

const orders = computed(() => ordersData.value?.orders || []);
const products = computed(() => productsData.value?.products || []);

const showForm = ref(false);
const filterStatus = ref("");

const form = ref({
  product_id: "",
  sale_price: "",
  supplier_cost: "",
  ebay_fees: "0",
  shipping_cost: "0",
  buyer_name: "",
  shipping_address: "",
  ebay_order_id: "",
});

const filteredOrders = computed(() => {
  if (!filterStatus.value) return orders.value;
  return orders.value.filter((o: any) => o.order_status === filterStatus.value);
});

const selectedProduct = computed(() =>
  products.value.find((p: any) => p.id === form.value.product_id)
);

watch(() => form.value.product_id, (newId) => {
  const p = products.value.find((prod: any) => prod.id === newId);
  if (p) {
    form.value.supplier_cost = p.supplier_cost;
    form.value.sale_price = p.calculated_sale_price;
  }
});

const estimatedProfit = computed(() => {
  const sale = parseFloat(form.value.sale_price) || 0;
  const cost = parseFloat(form.value.supplier_cost) || 0;
  const fees = parseFloat(form.value.ebay_fees) || 0;
  const ship = parseFloat(form.value.shipping_cost) || 0;
  return (sale - cost - fees - ship).toFixed(2);
});

function resetForm() {
  form.value = { product_id: "", sale_price: "", supplier_cost: "", ebay_fees: "0", shipping_cost: "0", buyer_name: "", shipping_address: "", ebay_order_id: "" };
}

const saving = ref(false);
async function saveOrder() {
  saving.value = true;
  try {
    await $fetch("/api/orders", { method: "POST", body: form.value });
    showForm.value = false;
    resetForm();
    refreshOrders();
  } catch (e: any) {
    alert(e.data?.message || "Failed to save order");
  } finally {
    saving.value = false;
  }
}

async function updateOrderStatus(id: string, newStatus: string) {
  const tracking = newStatus === "shipped" ? prompt("Enter tracking number (optional):") : undefined;
  try {
    await $fetch(`/api/orders/${id}`, {
      method: "PUT",
      body: { order_status: newStatus, ...(tracking ? { tracking_number: tracking } : {}) },
    });
    refreshOrders();
  } catch (e: any) {
    alert(e.data?.message || "Failed to update order");
  }
}

const formatCurrency = (val: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(val) || 0);

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  ordered: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
};

const statusFlow: Record<string, string> = {
  new: "ordered",
  ordered: "shipped",
  shipped: "delivered",
};
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Orders</h1>
      <button @click="showForm = true" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
        + Add Order
      </button>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <select v-model="filterStatus" class="px-3 py-2 border border-gray-300 rounded-md text-sm">
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="ordered">Ordered</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
      </select>
    </div>

    <!-- Order Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Add Order</h2>
          <button @click="showForm = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form @submit.prevent="saveOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select v-model="form.product_id" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Select a product</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.product_name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sale Price ($) *</label>
              <input v-model="form.sale_price" type="number" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Supplier Cost ($)</label>
              <input v-model="form.supplier_cost" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">eBay Fees ($)</label>
              <input v-model="form.ebay_fees" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Shipping Cost ($)</label>
              <input v-model="form.shipping_cost" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>

          <div class="bg-green-50 p-3 rounded-md text-sm">
            <strong>Estimated Profit:</strong> ${{ estimatedProfit }}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">eBay Order ID</label>
            <input v-model="form.ebay_order_id" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
            <input v-model="form.buyer_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
            <textarea v-model="form.shipping_address" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="submit" :disabled="saving" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {{ saving ? "Saving..." : "Add Order" }}
            </button>
            <button type="button" @click="showForm = false" class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-gray-500 border-b">
            <tr>
              <th class="px-4 py-3">Product</th>
              <th class="px-4 py-3">Buyer</th>
              <th class="px-4 py-3">Sale</th>
              <th class="px-4 py-3">Profit</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Tracking</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id" class="border-b border-gray-100 hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ o.product_name || "Manual Order" }}</div>
                <div v-if="o.sku" class="text-xs text-gray-400">{{ o.sku }}</div>
                <a v-if="o.supplier_url" :href="o.supplier_url" target="_blank" class="text-xs text-blue-500 hover:underline">Supplier Link</a>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-900">{{ o.buyer_name || "—" }}</div>
                <div v-if="o.shipping_address" class="text-xs text-gray-400 max-w-xs truncate">{{ o.shipping_address }}</div>
              </td>
              <td class="px-4 py-3">{{ formatCurrency(o.sale_price) }}</td>
              <td class="px-4 py-3 font-semibold" :class="parseFloat(o.net_profit) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(o.net_profit) }}
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium" :class="statusColors[o.order_status] || 'bg-gray-100'">
                  {{ o.order_status }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ o.tracking_number || "—" }}</td>
              <td class="px-4 py-3">
                <button
                  v-if="statusFlow[o.order_status]"
                  @click="updateOrderStatus(o.id, statusFlow[o.order_status])"
                  class="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  Mark {{ statusFlow[o.order_status] }}
                </button>
                <span v-else class="text-xs text-gray-400">Complete</span>
              </td>
            </tr>
            <tr v-if="!filteredOrders.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                No orders found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
