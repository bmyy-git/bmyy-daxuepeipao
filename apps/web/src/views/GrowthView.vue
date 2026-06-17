<script setup lang="ts">
import { BadgeDollarSign, Medal, Sparkles, WalletCards } from '@lucide/vue'
import { store } from '../store'
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h1>成长档案</h1><p>只记录可追溯的验收成果、规划变化、复盘和荣誉。</p></div></div>
    <section class="grid grid-3">
      <article class="stat-card"><span class="stat-icon"><Medal /></span><div><strong>{{ store.state.honors.filter(h => h.earned).length }}</strong><span>已获得荣誉</span></div></article>
      <article class="stat-card"><span class="stat-icon"><WalletCards /></span><div><strong>¥{{ store.state.bonus.total }}</strong><span>累计奖金</span></div></article>
      <article class="stat-card"><span class="stat-icon"><BadgeDollarSign /></span><div><strong>¥{{ store.state.bonus.pending }}</strong><span>待审核/结算</span></div></article>
    </section>

    <div class="grid growth-layout section-gap">
      <section class="card">
        <div class="card-header"><div><h2>成长时间线</h2><p>每条记录都有来源和日期。</p></div><Sparkles /></div>
        <div class="timeline">
          <div v-for="event in store.state.growth" :key="event.id" class="timeline-item current">
            <span class="timeline-dot" />
            <div class="timeline-card"><strong>{{ event.title }}</strong><p>{{ event.description }}</p><small>{{ event.date }}</small></div>
          </div>
        </div>
      </section>
      <aside class="grid side-stack">
        <section class="card">
          <div class="card-header"><div><h3>荣誉徽章</h3></div></div>
          <div class="honor-grid">
            <article v-for="honor in store.state.honors" :key="honor.id" :class="{ locked: !honor.earned }">
              <Medal />
              <strong>{{ honor.title }}</strong>
              <span>{{ honor.earned ? '已获得' : honor.description }}</span>
            </article>
          </div>
        </section>
        <section class="card">
          <div class="card-header"><div><h3>奖金流水</h3><p>任务验收不等于自动结算。</p></div></div>
          <div class="ledger"><span>已结算</span><strong>¥{{ store.state.bonus.settled }}</strong></div>
          <div class="ledger"><span>待审核/支付</span><strong>¥{{ store.state.bonus.pending }}</strong></div>
          <div class="notice section-gap">所有金额需经过独立审核，以正式协议和支付结果为准。</div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.growth-layout { grid-template-columns: minmax(0, 1.25fr) minmax(320px, .85fr); align-items: start; }
.side-stack { gap: 18px; }
.timeline-card p { margin: 7px 0; color: var(--muted); line-height: 1.55; }
.timeline-card small { color: #8b9b99; }
.honor-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.honor-grid article { min-height: 120px; padding: 14px; border-radius: 14px; display: grid; align-content: center; justify-items: center; gap: 6px; color: var(--brand); text-align: center; background: var(--soft); }
.honor-grid article.locked { color: #8b9997; filter: grayscale(1); opacity: .68; }
.honor-grid strong { font-size: 13px; }
.honor-grid span { color: var(--muted); font-size: 10px; }
.ledger { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid var(--line); }
@media (max-width: 900px) { .growth-layout { grid-template-columns: 1fr; } }
</style>

