<script setup lang="ts">
import { BookMarked, Flag, History } from '@lucide/vue'
import { store } from '../store'
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div><h1>我的通关地图</h1><p>{{ store.state.student.sopVersion }} · 由 {{ store.state.mentor.name }} 确认</p></div>
      <RouterLink class="btn btn-secondary" to="/profile#goal">修订目标</RouterLink>
    </div>
    <div class="grid sop-layout">
      <section class="card">
        <div class="card-header"><div><h2>四年路线图</h2><p>路线会随目标和阶段持续迭代，历史版本不会被覆盖。</p></div><BookMarked /></div>
        <div class="timeline">
          <div v-for="phase in store.state.sop" :key="phase.id" class="timeline-item" :class="phase.status">
            <span class="timeline-dot" />
            <div class="timeline-card">
              <div class="card-header"><div><strong>{{ phase.semester }} · {{ phase.theme }}</strong><p>{{ phase.description }}</p></div><span>{{ phase.progress }}%</span></div>
              <div class="progress"><span :style="{ width: `${phase.progress}%` }" /></div>
            </div>
          </div>
        </div>
      </section>
      <aside class="grid side-stack">
        <section class="card">
          <div class="card-header"><div><h3>当前红线</h3><p>需要持续关注</p></div><Flag /></div>
          <ul class="red-lines"><li>核心课程不得挂科</li><li>保持无违纪记录</li><li>政策结论以学院正式通知为准</li></ul>
        </section>
        <section class="card">
          <div class="card-header"><div><h3>版本历史</h3></div><History /></div>
          <div class="version"><strong>{{ store.state.student.sopVersion }}</strong><span>当前生效 · 导师确认</span></div>
          <div class="version"><strong>V0.1</strong><span>AI 初版草案 · 已归档</span></div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sop-layout { grid-template-columns: minmax(0, 1.6fr) minmax(280px, .7fr); align-items: start; }
.side-stack { gap: 18px; }
.red-lines { display: grid; gap: 10px; padding-left: 20px; color: #7e3639; line-height: 1.55; }
.version { padding: 12px 0; border-bottom: 1px solid var(--line); }
.version:last-child { border: 0; }
.version strong, .version span { display: block; }
.version span { margin-top: 4px; color: var(--muted); font-size: 12px; }
@media (max-width: 900px) { .sop-layout { grid-template-columns: 1fr; } }
</style>

