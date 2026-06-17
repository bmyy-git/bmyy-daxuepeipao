<script setup lang="ts">
import { Send } from '@lucide/vue'
import { reactive } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const form = reactive({ period: '2026 年第 25 周', type: 'weekly' as const, wins: '', unfinished: '', blocker: '', mood: 4, support: '', nextGoal: '' })
function submit() {
  if (!form.wins.trim()) return
  store.submitReview({ ...form })
  form.wins = ''; form.unfinished = ''; form.blocker = ''; form.support = ''; form.nextGoal = ''
}
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h1>周期复盘</h1><p>把行动变成经验，让导师知道你真正需要什么支持。</p></div></div>
    <div class="grid review-layout">
      <section class="card">
        <div class="card-header"><div><h2>本周复盘</h2><p>{{ form.period }} · 大约需要 8 分钟</p></div></div>
        <div class="form-grid">
          <div class="field full"><label>本周最重要的完成事项</label><textarea v-model="form.wins" placeholder="哪些事真正向目标推进了？" /></div>
          <div class="field"><label>未完成事项</label><textarea v-model="form.unfinished" placeholder="没有可留空" /></div>
          <div class="field"><label>最大困难</label><textarea v-model="form.blocker" placeholder="卡在哪里？" /></div>
          <div class="field"><label>状态评分（1-5）</label><input v-model.number="form.mood" type="number" min="1" max="5" /></div>
          <div class="field"><label>希望导师支持</label><input v-model="form.support" placeholder="需要解释、资源还是沟通？" /></div>
          <div class="field full"><label>下一周最重要的目标</label><input v-model="form.nextGoal" placeholder="只写最重要的一件事也可以" /></div>
        </div>
        <button class="btn btn-primary section-gap" :disabled="!form.wins.trim()" @click="submit"><Send :size="17" />提交导师反馈</button>
      </section>
      <aside class="card">
        <div class="card-header"><div><h2>历史复盘</h2><p>导师反馈会沉淀到成长档案。</p></div></div>
        <EmptyState v-if="!store.state.reviews.length" title="还没有历史复盘" description="提交本周复盘后，会在这里跟踪导师反馈。" />
        <div v-else class="review-list">
          <article v-for="review in store.state.reviews" :key="review.id" class="review-item">
            <div class="card-header"><strong>{{ review.period }}</strong><StatusBadge :tone="review.status === 'closed' ? 'green' : 'amber'" :label="review.status === 'closed' ? '已反馈' : '等待导师'" /></div>
            <p>{{ review.wins }}</p>
            <div v-if="review.mentorFeedback" class="notice success-notice">{{ review.mentorFeedback }}</div>
          </article>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.review-layout { grid-template-columns: minmax(0, 1.35fr) minmax(300px, .8fr); align-items: start; }
.review-list { display: grid; gap: 12px; }
.review-item { padding: 15px; border: 1px solid var(--line); border-radius: 14px; }
.review-item .card-header { margin-bottom: 10px; }
.review-item p { color: var(--muted); line-height: 1.5; }
@media (max-width: 900px) { .review-layout { grid-template-columns: 1fr; } }
</style>

