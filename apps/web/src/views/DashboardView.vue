<script setup lang="ts">
import { AlertTriangle, ArrowRight, CheckCircle2, Flame, Map, Trophy } from '@lucide/vue'
import { computed } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const actionTasks = computed(() =>
  [...store.state.tasks].sort((a, b) => {
    const rank = { changes_requested: 0, overdue: 1, submitted: 2, doing: 3, todo: 4, accepted: 5, cancelled: 6 }
    return rank[a.status] - rank[b.status]
  }).slice(0, 4),
)
const currentSop = computed(() => store.state.sop.find(item => item.status === 'current') || store.state.sop[0])
const labels: Record<string, string> = {
  todo: '待开始', doing: '进行中', submitted: '待导师验收', changes_requested: '待补充',
  accepted: '已验收', overdue: '已逾期', cancelled: '已取消',
}
const tones: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray'> = {
  todo: 'gray', doing: 'blue', submitted: 'amber', changes_requested: 'red', accepted: 'green', overdue: 'red', cancelled: 'gray',
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div><h1>下午好，{{ store.state.student.name }}</h1><p>先处理最需要你行动的事，今天不用把所有事情一次做完。</p></div>
      <RouterLink class="btn btn-primary" to="/reviews">完成本周复盘</RouterLink>
    </div>

    <div v-if="store.urgentTasks.value.length" class="notice danger-notice">
      <strong>有 {{ store.urgentTasks.value.length }} 项任务需要优先处理。</strong>
      被退回的成果要补充后重新提交，才会计入正式完成。
    </div>

    <section class="grid grid-4 section-gap">
      <article class="stat-card"><span class="stat-icon"><Map /></span><div><strong>{{ store.completionRate.value }}%</strong><span>SOP 任务验收率</span></div></article>
      <article class="stat-card"><span class="stat-icon"><CheckCircle2 /></span><div><strong>{{ store.acceptedTasks.value.length }}/{{ store.state.tasks.length }}</strong><span>已验收任务</span></div></article>
      <article class="stat-card"><span class="stat-icon"><Flame /></span><div><strong>{{ store.state.student.streak }} 天</strong><span>连续行动</span></div></article>
      <article class="stat-card"><span class="stat-icon"><Trophy /></span><div><strong>{{ store.state.honors.filter(h => h.earned).length }}</strong><span>已解锁荣誉</span></div></article>
    </section>

    <div class="dashboard-grid section-gap">
      <section class="card">
        <div class="card-header">
          <div><h2>此刻最该做什么</h2><p>按退回、逾期和截止时间自动排序。</p></div>
          <RouterLink class="text-link" to="/tasks">全部任务 <ArrowRight :size="15" /></RouterLink>
        </div>
        <div class="task-list">
          <RouterLink v-for="task in actionTasks" :key="task.id" :to="`/tasks/${task.id}`" class="task-row">
            <span class="priority-dot" :class="task.priority" />
            <div>
              <h3>{{ task.title }}</h3>
              <p>{{ task.category }} · {{ task.deadline }} 截止</p>
              <div class="task-meta"><StatusBadge :tone="tones[task.status]" :label="labels[task.status]" /></div>
            </div>
            <ArrowRight :size="18" />
          </RouterLink>
        </div>
      </section>

      <aside class="grid side-stack">
        <section class="card">
          <div class="card-header"><div><h3>当前规划</h3><p>{{ store.state.student.sopVersion }}</p></div></div>
          <h3>{{ currentSop?.theme || '路线图生成中' }}</h3>
          <p class="muted">{{ currentSop?.description || '导师和丫丫 AI 正在整理你的资料，正式 SOP 确认后会在这里展开。' }}</p>
          <div class="progress"><span :style="{ width: `${currentSop?.progress || 0}%` }" /></div>
          <RouterLink class="btn btn-ghost section-gap" to="/sop">查看完整路线图</RouterLink>
        </section>
        <section class="card ai-card">
          <AlertTriangle :size="23" />
          <h3>本周提醒</h3>
          <p>程序设计竞赛任务等待补充训练记录。学院政策类信息请以正式通知为准。</p>
          <RouterLink class="text-link" to="/ai">问问丫丫 AI</RouterLink>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, .75fr); gap: 18px; align-items: start; }
.card-header .text-link { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.side-stack { gap: 18px; }
.ai-card { color: white; background: linear-gradient(145deg, #005a53, #007570); }
.ai-card h3 { margin: 10px 0 8px; }
.ai-card p { color: rgba(255,255,255,.72); line-height: 1.6; }
.ai-card .text-link { color: white; }
@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }
</style>

