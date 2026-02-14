<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { data: productsData } = useFetch("/api/products");
const products = computed(() => productsData.value?.products || []);

const selectedProductId = ref("");
const pricingData = ref<any>(null);
const loading = ref(false);

async function loadPricing() {
  if (!selectedProductId.value) return;
  loading.value = true;
  try {
    const data = await $fetch(`/api/pricing/${selectedProductId.value}`);
    pricingData.value = data;
  } catch (e: any) {
    alert(e.data?.message || "Failed to load pricing data");
  } finally {
    loading.value = false;
  }
}

watch(selectedProductId, () => {
  pricingData.value = null;
  if (selectedProductId.value) loadPricing();
});

const selectedProduct = computed(() =>
  products.value.find((p: any) => p.id === selectedProductId.value)
);

// Pricing rules form
const rulesForm = ref({
  min_margin_percent: "10",
  max_price_limit: "999.99",
  auto_undercut_amount: "0.50",
  auto_pricing_enabled: false,
});

watch(pricingData, (data) => {
  if (data?.rules) {
    rulesForm.value = {
      min_margin_percent: data.rules.min_margin_percent || "10",
      max_price_limit: data.rules.max_price_limit || "999.99",
      auto_undercut_amount: data.rules.auto_undercut_amount || "0.50",
      auto_pricing_enabled: data.rules.auto_pricing_enabled || false,
    };
  }
});

const savingRules = ref(false);
async function saveRules() {
  savingRules.value = true;
  try {
    await $fetch(`/api/pricing/${selectedProductId.value}`, {
      method: "POST",
      body: rulesForm.value,
    });
    loadPricing();
  } catch (e: any) {
    alert(e.data?.message || "Failed to save pricing rules");
  } finally {
    savingRules.value = false;
  }
}

// Competitor price form
const competitorForm = ref({
  competitor_name: "",
  competitor_price: "",
  competitor_url: "",
});

const savingCompetitor = ref(false);
async function addCompetitor() {
  savingCompetitor.value = true;
  try {
    await $fetch("/api/pricing/competitors", {
      method: "POST",
      body: {
        product_id: selectedProductId.value,
        ...competitorForm.value,
      },
    });
    competitorForm.value = { competitor_name: "", competitor_price: "", competitor_url: "" };
    loadPricing();
  } catch (e: any) {
    alert(e.data?.message || "Failed to add competitor");
  } finally {
    savingCompetitor.value = false;
  }
}

const formatCurrency = (val: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(val) || 0);

const competitors = computed(() => pricingData.value?.competitors || []);

const lowestCompetitor = computed(() => {
  if (!competitors.value.length) return null;
  return competitors.value.reduce((min: any, c: any) =>
    parseFloat(c.competitor_price) < parseFloat(min.competitor_price) ? c : min
  );
});

const suggestedPrice = computed(() => {
  if (!lowestCompetitor.value || !selectedProduct.value) return null;
  const undercut = parseFloat(rulesForm.value.auto_undercut_amount) || 0;
  const newPrice = parseFloat(lowestCompetitor.value.competitor_price) - undercut;
  const minPrice = parseFloat(selectedProduct.value.supplier_cost) * (1 + parseFloat(rulesForm.value.min_margin_percent) / 100);
  if (newPrice < minPrice) return null;
  if (newPrice > parseFloat(rulesForm.value.max_price_limit)) return null;
  return newPrice.toFixed(2);
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Smart Pricing</h1>

    <!-- Product Selector -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
      <select v-model="selectedProductId" class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm">
        <option value="">Choose a product...</option>
        <option v-for="p in products" :key="p.id" :value="p.id">
          {{ p.product_name }} — {{ formatCurrency(p.calculated_sale_price) }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-400">Loading pricing data...</div>

    <div v-if="selectedProduct && !loading" class="space-y-6">
      <!-- Product Summary -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Product Overview</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Supplier Cost</span>
            <p class="font-semibold">{{ formatCurrency(selectedProduct.supplier_cost) }}</p>
          </div>
          <div>
            <span class="text-gray-500">Markup</span>
            <p class="font-semibold">{{ selectedProduct.target_markup_percent }}%</p>
          </div>
          <div>
            <span class="text-gray-500">Current Price</span>
            <p class="font-semibold">{{ formatCurrency(selectedProduct.calculated_sale_price) }}</p>
          </div>
          <div>
            <span class="text-gray-500">Total Profit</span>
            <p class="font-semibold text-green-600">{{ formatCurrency(selectedProduct.total_profit) }}</p>
          </div>
        </div>
      </div>

      <!-- Pricing Rules -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Auto-Pricing Rules</h2>
        <form @submit.prevent="saveRules" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Min Margin (%)</label>
              <input v-model="rulesForm.min_margin_percent" type="number" step="0.1" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Max Price Limit ($)</label>
              <input v-model="rulesForm.max_price_limit" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Undercut Amount ($)</label>
              <input v-model="rulesForm.auto_undercut_amount" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="rulesForm.auto_pricing_enabled" type="checkbox" id="autoEnabled" class="rounded border-gray-300" />
            <label for="autoEnabled" class="text-sm text-gray-700">Enable auto-pricing (runs via scheduled function)</label>
          </div>
          <div class="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800">
            <strong>Logic:</strong> If competitor price &lt; your price AND new price &gt; minimum margin, then update listing price automatically.
          </div>
          <button type="submit" :disabled="savingRules" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {{ savingRules ? "Saving..." : "Save Rules" }}
          </button>
        </form>
      </div>

      <!-- Suggested Price -->
      <div v-if="suggestedPrice" class="bg-green-50 border border-green-200 rounded-lg p-5">
        <h3 class="text-md font-semibold text-green-800 mb-1">Suggested Price: ${{ suggestedPrice }}</h3>
        <p class="text-sm text-green-700">Based on undercutting the lowest competitor by ${{ rulesForm.auto_undercut_amount }}</p>
      </div>
      <div v-else-if="lowestCompetitor && !suggestedPrice" class="bg-red-50 border border-red-200 rounded-lg p-5">
        <h3 class="text-md font-semibold text-red-800 mb-1">Cannot undercut further</h3>
        <p class="text-sm text-red-700">Undercutting would push the price below your minimum margin.</p>
      </div>

      <!-- Competitor Prices -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Competitor Prices</h2>

        <!-- Add competitor form -->
        <form @submit.prevent="addCompetitor" class="flex flex-col sm:flex-row gap-3 mb-4">
          <input v-model="competitorForm.competitor_name" type="text" placeholder="Competitor name" class="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1" />
          <input v-model="competitorForm.competitor_price" type="number" step="0.01" min="0" placeholder="Price" required class="px-3 py-2 border border-gray-300 rounded-md text-sm w-32" />
          <input v-model="competitorForm.competitor_url" type="url" placeholder="URL (optional)" class="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1" />
          <button type="submit" :disabled="savingCompetitor" class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50">
            Add
          </button>
        </form>

        <table class="w-full text-sm">
          <thead class="text-left text-gray-500 border-b">
            <tr>
              <th class="pb-2">Competitor</th>
              <th class="pb-2">Price</th>
              <th class="pb-2">vs Yours</th>
              <th class="pb-2">URL</th>
              <th class="pb-2">Checked</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in competitors" :key="c.id" class="border-b border-gray-100">
              <td class="py-2">{{ c.competitor_name || "Unknown" }}</td>
              <td class="py-2 font-semibold">{{ formatCurrency(c.competitor_price) }}</td>
              <td class="py-2" :class="parseFloat(c.competitor_price) < parseFloat(selectedProduct.calculated_sale_price) ? 'text-red-600' : 'text-green-600'">
                {{ parseFloat(c.competitor_price) < parseFloat(selectedProduct.calculated_sale_price) ? "Lower" : "Higher" }}
              </td>
              <td class="py-2">
                <a v-if="c.competitor_url" :href="c.competitor_url" target="_blank" class="text-blue-500 hover:underline text-xs">View</a>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="py-2 text-gray-400 text-xs">{{ new Date(c.checked_at).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="!competitors.length">
              <td colspan="5" class="py-4 text-center text-gray-400">No competitor prices tracked yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!selectedProductId" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-400">
      Select a product above to manage its pricing strategy.
    </div>
  </div>
</template>
