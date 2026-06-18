<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest } from '../api'

const route = useRoute()
const router = useRouter()
const error = ref('')

onMounted(async () => {
  try {
    const idd = String(route.query.idd || route.query.id1 || '')
    const idh = String(route.query.idh || route.query.id2 || '')
    const result = await apiRequest<{ redirectTo: string; cardType?: string; message?: string }>(
      `/nfc/resolve?idd=${encodeURIComponent(idd)}&idh=${encodeURIComponent(idh)}`,
      {},
      '',
    )
    if (result.redirectTo === 'activate') {
      await router.replace({ path: '/activate', query: { idd, idh } })
      return
    }
    const routeMap: Record<string, string> = {
      waiting: '/waiting',
      'mentor-ready': '/mentor-ready',
      dashboard: '/dashboard',
      growth: '/growth',
      parent: '/parent',
      error: '/',
    }
    await router.replace({
      path: '/login',
      query: {
        mode: 'card',
        idd,
        ...(idh ? { idh } : {}),
        redirect: routeMap[result.redirectTo] || '/',
      },
    })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '卡片识别失败'
  }
})
</script>

<template>
  <main class="entry-screen">
    <img src="/img/yayasmart-logo-5A-FFFFFF.png" alt="笨猫丫丫 OPC" />
    <template v-if="!error">
      <div class="entry-pulse" />
      <h1>正在识别你的丫丫卡</h1>
      <p>马上带你回到当前旅程</p>
    </template>
    <template v-else>
      <h1>这张卡片暂时无法使用</h1>
      <p>{{ error }}</p>
      <RouterLink class="btn btn-secondary" to="/">返回首页</RouterLink>
    </template>
  </main>
</template>

<style scoped>
.entry-screen { min-height: 100vh; display: grid; place-content: center; justify-items: center; color: white; text-align: center; background: linear-gradient(145deg, #004b46, #007570); }
img { width: 82px; height: 82px; object-fit: contain; }
.entry-pulse { width: 42px; height: 42px; margin: 28px; border: 4px solid rgba(255,255,255,.25); border-top-color: white; border-radius: 50%; animation: spin .8s linear infinite; }
h1 { margin-bottom: 8px; font-size: 26px; }
p { color: rgba(255,255,255,.7); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
