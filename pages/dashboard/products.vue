<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { data, refresh } = useFetch("/api/products");
const products = computed(() => data.value?.products || []);

const showForm = ref(false);
const editingProduct = ref<any>(null);

const form = ref({
  product_name: "",
  sku: "",
  supplier_cost: "",
  target_markup_percent: "30",
  category: "",
  description: "",
  supplier_url: "",
  notes: "",
});

const searchQuery = ref("");
const filterCategory = ref("");

const categories = computed(() => {
  const cats = new Set(products.value.map((p: any) => p.category).filter(Boolean));
  return Array.from(cats);
});

const filteredProducts = computed(() => {
  let result = products.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((p: any) =>
      p.product_name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
  }
  if (filterCategory.value) {
    result = result.filter((p: any) => p.category === filterCategory.value);
  }
  return result;
});

function resetForm() {
  form.value = {
    product_name: "",
    sku: "",
    supplier_cost: "",
    target_markup_percent: "30",
    category: "",
    description: "",
    supplier_url: "",
    notes: "",
  };
  editingProduct.value = null;
}

function openAdd() {
  resetForm();
  showForm.value = true;
}

function openEdit(product: any) {
  editingProduct.value = product;
  form.value = {
    product_name: product.product_name,
    sku: product.sku || "",
    supplier_cost: product.supplier_cost,
    target_markup_percent: product.target_markup_percent,
    category: product.category || "",
    description: product.description || "",
    supplier_url: product.supplier_url || "",
    notes: product.notes || "",
  };
  showForm.value = true;
}

const saving = ref(false);

async function saveProduct() {
  saving.value = true;
  try {
    if (editingProduct.value) {
      await $fetch(`/api/products/${editingProduct.value.id}`, {
        method: "PUT",
        body: form.value,
      });
    } else {
      await $fetch("/api/products", {
        method: "POST",
        body: form.value,
      });
    }
    showForm.value = false;
    resetForm();
    refresh();
  } catch (e: any) {
    alert(e.data?.message || "Failed to save product");
  } finally {
    saving.value = false;
  }
}

async function deleteProduct(id: string) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  try {
    await $fetch(`/api/products/${id}`, { method: "DELETE" });
    refresh();
  } catch (e: any) {
    alert(e.data?.message || "Failed to delete");
  }
}

const calculatedPrice = computed(() => {
  const cost = parseFloat(form.value.supplier_cost);
  const markup = parseFloat(form.value.target_markup_percent);
  if (isNaN(cost) || isNaN(markup)) return "—";
  return "$" + (cost * (1 + markup / 100)).toFixed(2);
});

const formatCurrency = (val: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(val) || 0);

function sellThroughRate(p: any) {
  if (!p.orders_count) return "0%";
  return ((p.orders_count / Math.max(p.orders_count + 1, 1)) * 100).toFixed(0) + "%";
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Products</h1>
      <button @click="openAdd" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
        + Add Product
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by name or SKU..."
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        v-model="filterCategory"
        class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Product Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ editingProduct ? "Edit Product" : "Add Product" }}</h2>
          <button @click="showForm = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input v-model="form.product_name" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input v-model="form.sku" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input v-model="form.category" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. electronics" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Supplier Cost ($) *</label>
              <input v-model="form.supplier_cost" type="number" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
              <input v-model="form.target_markup_percent" type="number" step="0.1" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div class="bg-blue-50 p-3 rounded-md text-sm">
            <strong>Calculated Sale Price:</strong> {{ calculatedPrice }}
            <div class="text-xs text-gray-500 mt-1">Formula: cost × (1 + markup%)</div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Supplier URL</label>
            <input v-model="form.supplier_url" type="url" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="https://..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="submit" :disabled="saving" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ saving ? "Saving..." : (editingProduct ? "Update Product" : "Add Product") }}
            </button>
            <button type="button" @click="showForm = false" class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Products Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-gray-500 border-b">
            <tr>
              <th class="px-4 py-3">Product</th>
              <th class="px-4 py-3">SKU</th>
              <th class="px-4 py-3">Cost</th>
              <th class="px-4 py-3">Markup</th>
              <th class="px-4 py-3">Sale Price</th>
              <th class="px-4 py-3">Orders</th>
              <th class="px-4 py-3">Profit</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id" class="border-b border-gray-100 hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ p.product_name }}</div>
                <div v-if="p.category" class="text-xs text-gray-400">{{ p.category }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ p.sku || "—" }}</td>
              <td class="px-4 py-3">{{ formatCurrency(p.supplier_cost) }}</td>
              <td class="px-4 py-3">{{ p.target_markup_percent }}%</td>
              <td class="px-4 py-3 font-semibold">{{ formatCurrency(p.calculated_sale_price) }}</td>
              <td class="px-4 py-3">{{ p.orders_count }}</td>
              <td class="px-4 py-3" :class="parseFloat(p.total_profit) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(p.total_profit) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button @click="openEdit(p)" class="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  <NuxtLink :to="`/dashboard/listings?product=${p.id}`" class="text-purple-600 hover:text-purple-800 text-xs font-medium">List</NuxtLink>
                  <button @click="deleteProduct(p.id)" class="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredProducts.length">
              <td colspan="8" class="px-4 py-8 text-center text-gray-400">
                No products found. Click "Add Product" to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
