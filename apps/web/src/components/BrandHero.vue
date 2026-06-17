<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ compact?: boolean; title: string; subtitle: string; eyebrow?: string }>(), {
  compact: false,
  eyebrow: '学业规划，一触即达',
})

const failed = ref(false)
</script>

<template>
  <section class="brand-hero" :class="{ compact }">
    <div class="hero-copy">
      <span class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
      <slot />
    </div>
    <div class="hero-media">
      <video
        v-if="!failed"
        autoplay
        muted
        loop
        playsinline
        poster="/img/yayasmart-logo-3A-1280-1080.png"
        @error="failed = true"
      >
        <source src="/mp4/yaya-smart.mp4" type="video/mp4" />
      </video>
      <img v-else src="/img/yayasmart-logo-3A-1280-1080.png" alt="笨猫丫丫品牌视觉" />
    </div>
  </section>
</template>
