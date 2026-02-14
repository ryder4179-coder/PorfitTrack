<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const route = useRoute();
const preselectedProduct = route.query.product as string | undefined;

const { data: listingsData, refresh: refreshListings } = useFetch("/api/listings");
const { data: productsData } = useFetch("/api/products");

const listings = computed(() => listingsData.value?.listings || []);
const products = computed(() => productsData.value?.products || []);

const showForm = ref(!!preselectedProduct);
const editingListing = ref<any>(null);

const form = ref({
  product_id: preselectedProduct || "",
  listing_title: "",
  listing_description: "",
  listing_price: "",
  ebay_category_id: "",
});

const filterStatus = ref("");
const filteredListings = computed(() => {
  if (!filterStatus.value) return listings.value;
  return listings.value.filter((l: any) => l.listing_status === filterStatus.value);
});

const selectedProduct = computed(() =>
  products.value.find((p: any) => p.id === form.value.product_id)
);

function generateTitle(product: any) {
  if (!product) return "";
  const parts = [product.product_name];
  if (product.category) parts.push(product.category);
  parts.push("Fast Shipping", "Best Price");
  return parts.join(" | ");
}

function generateDescription(product: any) {
  if (!product) return "";
  let desc = product.description || product.product_name;
  desc += "\n\nFeatures:\n- Premium quality\n- Fast shipping\n- Best price guarantee";
  if (product.sku) desc += `\n\nSKU: ${product.sku}`;
  return desc;
}

watch(() => form.value.product_id, (newId) => {
  if (newId && !editingListing.value) {
    const p = products.value.find((prod: any) => prod.id === newId);
    if (p) {
      form.value.listing_title = generateTitle(p);
      form.value.listing_description = generateDescription(p);
      form.value.listing_price = p.calculated_sale_price;
    }
  }
});

// Trigger initial auto-fill if preselected
if (preselectedProduct) {
  watch(products, (prods) => {
    if (prods.length && form.value.product_id && !form.value.listing_title) {
      const p = prods.find((prod: any) => prod.id === form.value.product_id);
      if (p) {
        form.value.listing_title = generateTitle(p);
        form.value.listing_description = generateDescription(p);
        form.value.listing_price = p.calculated_sale_price;
      }
    }
  }, { immediate: true });
}

function resetForm() {
  form.value = { product_id: "", listing_title: "", listing_description: "", listing_price: "", ebay_category_id: "" };
  editingListing.value = null;
}

function openAdd() {
  resetForm();
  showForm.value = true;
}

function openEdit(listing: any) {
  editingListing.value = listing;
  form.value = {
    product_id: listing.product_id || "",
    listing_title: listing.listing_title,
    listing_description: listing.listing_description || "",
    listing_price: listing.listing_price,
    ebay_category_id: listing.ebay_category_id || "",
  };
  showForm.value = true;
}

const saving = ref(false);
async function saveListing() {
  saving.value = true;
  try {
    if (editingListing.value) {
      await $fetch(`/api/listings/${editingListing.value.id}`, { method: "PUT", body: form.value });
    } else {
      await $fetch("/api/listings", { method: "POST", body: form.value });
    }
    showForm.value = false;
    resetForm();
    refreshListings();
  } catch (e: any) {
    alert(e.data?.message || "Failed to save listing");
  } finally {
    saving.value = false;
  }
}

async function updateStatus(id: string, status: string) {
  try {
    await $fetch(`/api/listings/${id}`, { method: "PUT", body: { listing_status: status } });
    refreshListings();
  } catch (e: any) {
    alert(e.data?.message || "Failed to update status");
  }
}

async function deleteListing(id: string) {
  if (!confirm("Delete this listing?")) return;
  try {
    await $fetch(`/api/listings/${id}`, { method: "DELETE" });
    refreshListings();
  } catch (e: any) {
    alert(e.data?.message || "Failed to delete");
  }
}

const formatCurrency = (val: any) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parseFloat(val) || 0);

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-red-100 text-red-700",
  sold: "bg-blue-100 text-blue-700",
};
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold text-gray-900">eBay Listings</h1>
      <button @click="openAdd" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
        + Create Listing
      </button>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <select v-model="filterStatus" class="px-3 py-2 border border-gray-300 rounded-md text-sm">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="ended">Ended</option>
        <option value="sold">Sold</option>
      </select>
    </div>

    <!-- Listing Form Modal -->
    <div v-if="showForm" class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ editingListing ? "Edit Listing" : "Create eBay Listing" }}</h2>
          <button @click="showForm = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form @submit.prevent="saveListing" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select v-model="form.product_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Select a product</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.product_name }} ({{ p.sku || 'no SKU' }})</option>
            </select>
          </div>

          <div v-if="selectedProduct" class="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
            Cost: {{ formatCurrency(selectedProduct.supplier_cost) }} | Suggested Price: {{ formatCurrency(selectedProduct.calculated_sale_price) }}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Listing Title *</label>
            <input v-model="form.listing_title" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            <p class="text-xs text-gray-400 mt-1">SEO format: Main Keyword | Feature | Fast Shipping | Best Price</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Listing Price ($) *</label>
            <input v-model="form.listing_price" type="number" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">eBay Category ID</label>
            <input v-model="form.ebay_category_id" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Optional" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="form.listing_description" rows="5" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="submit" :disabled="saving" class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {{ saving ? "Saving..." : (editingListing ? "Update Listing" : "Create Listing") }}
            </button>
            <button type="button" @click="showForm = false" class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Listings Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-gray-500 border-b">
            <tr>
              <th class="px-4 py-3">Title</th>
              <th class="px-4 py-3">Product</th>
              <th class="px-4 py-3">Price</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in filteredListings" :key="l.id" class="border-b border-gray-100 hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 max-w-xs truncate">{{ l.listing_title }}</div>
                <div v-if="l.ebay_item_id" class="text-xs text-gray-400">eBay: {{ l.ebay_item_id }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ l.product_name || "—" }}</td>
              <td class="px-4 py-3 font-semibold">{{ formatCurrency(l.listing_price) }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium" :class="statusColors[l.listing_status] || 'bg-gray-100'">
                  {{ l.listing_status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <button @click="openEdit(l)" class="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                  <button v-if="l.listing_status === 'draft'" @click="updateStatus(l.id, 'active')" class="text-green-600 hover:text-green-800 text-xs font-medium">Publish</button>
                  <button v-if="l.listing_status === 'active'" @click="updateStatus(l.id, 'ended')" class="text-orange-600 hover:text-orange-800 text-xs font-medium">End</button>
                  <button @click="deleteListing(l.id)" class="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredListings.length">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                No listings found. Create one from a product.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
