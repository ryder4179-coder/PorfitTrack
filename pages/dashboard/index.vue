<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { data: analytics, refresh } = useFetch("/api/analytics");

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);

const summary = computed(() => analytics.value?.summary || {
  total_revenue: 0,
  net_profit: 0,
  total_orders: 0,
  active_listings: 0,
  sell_through_rate: 0,
  return_rate: 0,
});

const metricCards = computed(() => [
  { label: "Total Revenue", value: formatCurrency(summary.value.total_revenue), color: "bg-blue-500" },
  { label: "Net Profit", value: formatCurrency(summary.value.net_profit), color: "bg-green-500" },
  { label: "Active Listings", value: summary.value.active_listings, color: "bg-purple-500" },
  { label: "Total Orders", value: summary.value.total_orders, color: "bg-orange-500" },
  { label: "Sell-Through Rate", value: summary.value.sell_through_rate + "%", color: "bg-teal-500" },
  { label: "Return Rate", value: summary.value.return_rate + "%", color: "bg-red-500" },
]);

const dbInitialized = ref(false);
const dbError = ref("");

async function initDb() {
  try {
    const res = await $fetch("/api/db-migrate", { method: "POST" });
    dbInitialized.value = true;
    refresh();
  } catch (e: any) {
    dbError.value = e.data?.message || "Failed to initialize database";
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div class="flex gap-2">
        <button @click="initDb" class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">
          Initialize DB
        </button>
        <button @click="refresh()" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="dbInitialized" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
      Database initialized successfully.
    </div>
    <div v-if="dbError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
      {{ dbError }}
    </div>

    <!-- Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <div v-for="card in metricCards" :key="card.label" class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">{{ card.label }}</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ card.value }}</p>
          </div>
          <div :class="card.color" class="w-10 h-10 rounded-lg flex items-center justify-center">
            <span class="text-white text-lg font-bold">{{ card.label[0] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue Chart (Simple Table) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (Last 30 Days)</h2>
        <div class="overflow-auto max-h-80">
          <table class="w-full text-sm">
            <thead class="text-left text-gray-500 border-b">
              <tr>
                <th class="pb-2">Date</th>
                <th class="pb-2">Revenue</th>
                <th class="pb-2">Profit</th>
                <th class="pb-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in analytics?.daily_revenue" :key="row.date" class="border-b border-gray-100">
                <td class="py-2">{{ row.date }}</td>
                <td class="py-2">{{ formatCurrency(row.revenue) }}</td>
                <td class="py-2" :class="parseFloat(row.profit) >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatCurrency(row.profit) }}</td>
                <td class="py-2">{{ row.orders }}</td>
              </tr>
              <tr v-if="!analytics?.daily_revenue?.length">
                <td colspan="4" class="py-4 text-center text-gray-400">No revenue data yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Profit by Category</h2>
        <div class="overflow-auto max-h-80">
          <table class="w-full text-sm">
            <thead class="text-left text-gray-500 border-b">
              <tr>
                <th class="pb-2">Category</th>
                <th class="pb-2">Profit</th>
                <th class="pb-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in analytics?.category_profit" :key="row.category" class="border-b border-gray-100">
                <td class="py-2 capitalize">{{ row.category }}</td>
                <td class="py-2" :class="parseFloat(row.profit) >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatCurrency(row.profit) }}</td>
                <td class="py-2">{{ row.orders }}</td>
              </tr>
              <tr v-if="!analytics?.category_profit?.length">
                <td colspan="3" class="py-4 text-center text-gray-400">No category data yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Top / Worst Products -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Top 10 Products</h2>
        <div class="space-y-3">
          <div v-for="(p, i) in analytics?.top_products" :key="i" class="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <span class="text-sm font-medium text-gray-900">{{ p.product_name }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ p.orders_count }} orders</span>
            </div>
            <span class="text-sm font-semibold text-green-600">{{ formatCurrency(p.total_profit) }}</span>
          </div>
          <p v-if="!analytics?.top_products?.length" class="text-center text-gray-400 py-4 text-sm">No product data yet</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Worst Performing Products</h2>
        <div class="space-y-3">
          <div v-for="(p, i) in analytics?.worst_products" :key="i" class="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <span class="text-sm font-medium text-gray-900">{{ p.product_name }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ p.orders_count }} orders, {{ p.returns_count }} returns</span>
            </div>
            <span class="text-sm font-semibold" :class="parseFloat(p.total_profit) >= 0 ? 'text-green-600' : 'text-red-600'">{{ formatCurrency(p.total_profit) }}</span>
          </div>
          <p v-if="!analytics?.worst_products?.length" class="text-center text-gray-400 py-4 text-sm">No product data yet</p>
        </div>
      </div>
    </div>
  </div>
</template>
