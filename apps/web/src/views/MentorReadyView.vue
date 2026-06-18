<script setup lang="ts">
import { Copy, Mail, Star } from '@lucide/vue'
import { ref } from 'vue'
import { store } from '../store'

const mode = ref<'bet' | 'annual'>('bet')
const copied = ref('')
function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value)
  copied.value = label
  window.setTimeout(() => copied.value = '', 1200)
}
</script>

<template>
  <main class="mentor-ready">
    <div class="page page-narrow">
      <section class="reveal-card">
        <span class="eyebrow">你的专属导师已就位</span>
        <img :src="store.state.mentor.avatar" alt="导师头像" />
        <h1>{{ store.state.mentor.name }}</h1>
        <p>{{ store.state.mentor.title }}</p>
        <div class="choice-grid mentor-tags"><span v-for="tag in store.state.mentor.tags" :key="tag" class="choice active">{{ tag }}</span></div>
        <div class="mentor-stats">
          <div><strong>{{ store.state.mentor.serviceCount }}</strong><span>辅导人次</span></div>
          <div><strong>{{ store.state.mentor.rating }}%</strong><span>好评率</span></div>
          <div><strong><Star :size="18" fill="currentColor" /></strong><span>规划导师</span></div>
        </div>
        <div class="grid grid-3 contact-grid">
          <a class="btn btn-secondary" :href="`mailto:${store.state.mentor.email}`"><Mail :size="17" />发送邮件</a>
          <button class="btn btn-secondary" @click="copy(store.state.mentor.wechat, '企微')"><Copy :size="17" />复制企微</button>
          <button class="btn btn-secondary" @click="copy(store.state.mentor.meeting, '会议号')"><Copy :size="17" />复制会议号</button>
        </div>
        <p v-if="copied" class="copy-tip">已复制{{ copied }}</p>
      </section>

      <section class="card section-gap">
        <div class="card-header"><div><h2>选择合作模式</h2><p>正式签署前请阅读完整服务协议。</p></div></div>
        <div class="grid grid-2">
          <button class="mode-card" :class="{ selected: mode === 'bet' }" @click="mode = 'bet'">
            <strong>结果分成模式</strong><span>前期 0 费用，按协议比例结算成果奖金</span>
          </button>
          <button class="mode-card" :class="{ selected: mode === 'annual' }" @click="mode = 'annual'">
            <strong>年费订阅模式</strong><span>按学年购买服务，奖励归学生</span>
          </button>
        </div>
        <RouterLink class="btn btn-primary confirm-btn" to="/dashboard">进入我的行动首页</RouterLink>
      </section>
    </div>
  </main>
</template>

<style scoped>
.mentor-ready { min-height: 100vh; padding: 35px 20px; background: linear-gradient(145deg, #ecf6f4, #f9fbfa); }
.reveal-card { padding: 36px; border-radius: 25px; color: white; text-align: center; background: linear-gradient(145deg, #004e49, #007570); box-shadow: var(--shadow); }
.reveal-card > img { width: 130px; height: 130px; margin: 22px 0 12px; border: 5px solid rgba(255,255,255,.2); border-radius: 50%; object-fit: cover; background: white; }
.reveal-card h1 { margin-bottom: 5px; }
.reveal-card p { color: rgba(255,255,255,.72); }
.mentor-tags { justify-content: center; }
.mentor-stats { display: grid; grid-template-columns: repeat(3, 1fr); margin: 25px 0; padding: 18px; border-radius: 15px; background: rgba(255,255,255,.1); }
.mentor-stats strong, .mentor-stats span { display: block; }
.mentor-stats strong { font-size: 20px; }
.mentor-stats span { margin-top: 4px; color: rgba(255,255,255,.65); font-size: 11px; }
.contact-grid .btn { background: white; }
.copy-tip { margin: 12px 0 0 !important; color: white !important; }
.mode-card { padding: 20px; border: 2px solid var(--line); border-radius: 15px; text-align: left; background: white; }
.mode-card.selected { border-color: var(--brand); background: var(--soft); }
.mode-card strong, .mode-card span { display: block; }
.mode-card span { margin-top: 7px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.confirm-btn { width: 100%; margin-top: 18px; }
</style>

