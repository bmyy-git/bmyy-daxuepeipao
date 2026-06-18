<script setup lang="ts">
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, Nfc, ShieldCheck } from '@lucide/vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BrandHero from '../components/BrandHero.vue'
import { store } from '../store'

const router = useRouter()
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const idd = (params.get('idd') || params.get('id1') || '').slice(0, 14)
  const idh = params.get('idh') || params.get('id2') || ''
  if (idd) {
    router.replace({
      path: '/login',
      query: {
        mode: 'card',
        idd,
        ...(idh ? { idh } : {}),
      },
    })
  }
})

function startJourney() {
  store.startNewJourney()
  router.push('/entry?idd=04NEWCARD01&idh=00A1-0099')
}
</script>

<template>
  <div class="page">
    <BrandHero
      class="landing-main-card"
      title="一张 NFC 卡片，开启四年学业陪跑"
      subtitle="从目标锚定、导师规划到每周行动、成果验收与成长复盘，笨猫丫丫陪你把大学规划真正做完。"
    >
      <div class="actions section-gap">
        <button class="btn btn-primary" @click="startJourney">
          模拟碰卡进入 <ArrowRight :size="18" />
        </button>
        <RouterLink class="btn btn-secondary" to="/login">登录系统</RouterLink>
      </div>
    </BrandHero>

    <section class="grid grid-4 section-gap">
      <article class="stat-card"><span class="stat-icon"><Nfc /></span><div><strong>一触即达</strong><span>NFC 自动识别身份与阶段</span></div></article>
      <article class="stat-card"><span class="stat-icon"><BadgeCheck /></span><div><strong>导师验收</strong><span>成果通过才计入正式完成</span></div></article>
      <article class="stat-card"><span class="stat-icon"><ChartNoAxesCombined /></span><div><strong>周期复盘</strong><span>每周行动形成长期成长轨迹</span></div></article>
      <article class="stat-card"><span class="stat-icon"><ShieldCheck /></span><div><strong>亲情共育</strong><span>家长仅查看学生授权摘要</span></div></article>
    </section>

    <section class="card section-gap">
      <div class="card-header"><div><h2>学生完整闭环</h2><p>不是“勾选完成”，而是每一步都有反馈和下一步。</p></div></div>
      <div class="timeline">
        <div v-for="(item, index) in ['激活建档与资料解析', '导师匹配与 SOP V1.0', '每周任务与成果提交', '导师验收或退回补充', '周期复盘与风险干预', '荣誉、奖金与目标修订']" :key="item" class="timeline-item current">
          <span class="timeline-dot" />
          <div class="timeline-card"><strong>{{ index + 1 }}. {{ item }}</strong></div>
        </div>
      </div>
    </section>
  </div>
</template>

