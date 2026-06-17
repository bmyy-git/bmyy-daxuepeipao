<script setup lang="ts">
withDefaults(defineProps<{ title: string; description: string; image?: string }>(), {
  image: '/img/yayasmart-logo-2B-900-900.png',
})
</script>

<template>
  <div class="empty-state">
    <img :src="image" alt="" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
