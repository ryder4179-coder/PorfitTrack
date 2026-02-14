<script setup>
useHead({
  htmlAttrs: { lang: "en-US" },
  title: "ProfitTrack - eBay Dropshipping Manager",
  meta: [
    {
      name: "description",
      content:
        "ProfitTrack is an eBay dropshipping management platform with automated listings, order tracking, smart pricing, and analytics.",
    },
  ],
  bodyAttrs: {
    class: 'font-display bg-gray-50'
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
