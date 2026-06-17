<script setup lang="ts">
import { Heart, Medal, ShieldCheck, TrendingUp } from '@lucide/vue'
import { computed, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import { store } from '../store'

const message = ref('')
const accepted = computed(() => store.acceptedTasks.value)
function send() {
  if (!message.value.trim()) return
  store.sendEncouragement(message.value)
  message.value = ''
}
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h1>家长观察室</h1><p>亲情卡只提供经学生授权的成长摘要，不开放学生私有操作。</p></div><span class="status-badge green"><ShieldCheck :size="14" />只读权限</span></div>
    <EmptyState v-if="!store.state.student.parentConsent" title="学生暂未开放观察授权" description="授权可能已撤回。请尊重学生隐私并通过线下方式沟通。" />
    <template v-else>
      <section class="parent-hero">
        <div><span>您的孩子</span><h2>{{ store.state.student.name }}</h2><p>{{ store.state.student.school }} · {{ store.state.student.major }} · {{ store.state.student.grade }}</p></div>
        <img src="/img/yayasmart-logo-3B-1280-1080.png" alt="成长陪跑品牌视觉" />
      </section>
      <section class="grid grid-3 section-gap">
        <article class="stat-card"><span class="stat-icon"><TrendingUp /></span><div><strong>{{ store.completionRate.value }}%</strong><span>任务验收率</span></div></article>
        <article class="stat-card"><span class="stat-icon"><Heart /></span><div><strong>{{ store.state.student.streak }} 天</strong><span>连续行动</span></div></article>
        <article class="stat-card"><span class="stat-icon"><Medal /></span><div><strong>{{ store.state.honors.filter(h => h.earned).length }}</strong><span>公开荣誉</span></div></article>
      </section>
      <div class="grid parent-grid section-gap">
        <section class="card">
          <div class="card-header"><div><h2>近期成长</h2><p>只展示已验收成果。</p></div></div>
          <div class="task-list">
            <div v-for="task in accepted" :key="task.id" class="task-row"><span class="priority-dot low" /><div><h3>{{ task.title }}</h3><p>{{ task.submissions.at(-1)?.reviewComment }}</p></div><span class="status-badge green">已完成</span></div>
          </div>
        </section>
        <aside class="card">
          <div class="card-header"><div><h2>发送鼓励</h2><p>消息会进入孩子的消息中心。</p></div></div>
          <div class="field"><textarea v-model="message" placeholder="写一句支持和鼓励的话..." /></div>
          <button class="btn btn-primary section-gap" :disabled="!message.trim()" @click="send"><Heart :size="17" />发送鼓励</button>
          <div class="notice section-gap">家长端默认不展示成绩单、AI 私聊、导师私密备注和奖金分润信息。</div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-header .status-badge { display: flex; align-items: center; gap: 5px; }
.parent-hero { position: relative; min-height: 230px; overflow: hidden; padding: 35px; border-radius: 23px; display: flex; align-items: center; color: white; background: linear-gradient(135deg, #005a53, #007570); }
.parent-hero > div { position: relative; z-index: 2; }
.parent-hero span { color: rgba(255,255,255,.7); }
.parent-hero h2 { margin: 8px 0; font-size: 38px; }
.parent-hero p { margin: 0; color: rgba(255,255,255,.75); }
.parent-hero img { position: absolute; right: 0; top: 0; width: 52%; height: 100%; object-fit: cover; opacity: .42; mix-blend-mode: screen; }
.parent-grid { grid-template-columns: minmax(0, 1.3fr) minmax(300px, .7fr); align-items: start; }
@media (max-width: 850px) { .parent-grid { grid-template-columns: 1fr; } }
</style>

