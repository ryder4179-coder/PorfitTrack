<script setup>
const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: "📊" },
  { title: "Products", path: "/dashboard/products", icon: "📦" },
  { title: "Listings", path: "/dashboard/listings", icon: "🏷" },
  { title: "Orders", path: "/dashboard/orders", icon: "🛒" },
  { title: "Pricing", path: "/dashboard/pricing", icon: "💰" },
];

const mobileMenuOpen = ref(false);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Bar -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div class="flex items-center justify-between px-4 h-16">
        <div class="flex items-center gap-4">
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="lg:hidden p-2 rounded-md hover:bg-gray-100">
            <span class="text-xl">☰</span>
          </button>
          <NuxtLink to="/dashboard" class="text-xl font-bold text-gray-900">
            ProfitTrack
          </NuxtLink>
        </div>
        <nav class="hidden lg:flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-3 py-2 text-sm font-medium rounded-md transition-colors"
            :class="$route.path === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
          >
            <span class="mr-1">{{ item.icon }}</span>
            {{ item.title }}
          </NuxtLink>
        </nav>
        <div class="text-sm text-gray-500">
          eBay Dropship Manager
        </div>
      </div>
    </header>

    <!-- Mobile Menu -->
    <div v-if="mobileMenuOpen" class="lg:hidden fixed inset-0 z-40 bg-black/30" @click="mobileMenuOpen = false">
      <nav class="bg-white w-64 h-full p-4 shadow-lg" @click.stop>
        <div class="flex items-center justify-between mb-6">
          <span class="text-lg font-bold">ProfitTrack</span>
          <button @click="mobileMenuOpen = false" class="p-1 hover:bg-gray-100 rounded">✕</button>
        </div>
        <div class="space-y-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="block px-3 py-2 text-sm font-medium rounded-md transition-colors"
            :class="$route.path === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
            @click="mobileMenuOpen = false"
          >
            <span class="mr-2">{{ item.icon }}</span>
            {{ item.title }}
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
