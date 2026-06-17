<script setup lang="ts">
defineProps<{ tone?: 'green' | 'red' | 'amber' | 'blue' | 'gray'; label: string }>()
</script>

<template><span class="status-badge" :class="tone || 'gray'">{{ label }}</span></template>
