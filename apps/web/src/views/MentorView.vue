<script setup lang="ts">
import { AlertTriangle, Check, ClipboardCheck, FileCheck2, MessageSquareText, RotateCcw, UserRoundCheck, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import DocumentPanel from '../components/DocumentPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const comments = ref<Record<string, string>>({})
const reviewFeedback = ref<Record<string, string>>({})
const pendingGoals = computed(() => store.state.goalRevisions.filter(item => item.status === 'pending'))
const statusLabel: Record<string, string> = { changes_requested: '待学生补充', submitted: '待验收', accepted: '已通过', doing: '进行中', todo: '待开始', overdue: '逾期' }

function review(taskId: string, submissionId: string, decision: 'accept' | 'request_changes') {
  const defaultComment = decision === 'accept' ? '成果符合完成标准，验收通过。' : '请根据完成标准补充证据后重新提交。'
  store.reviewSubmission(taskId, submissionId, decision, comments.value[submissionId] || defaultComment)
  comments.value[submissionId] = ''
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div><h1>导师工作台</h1><p>{{ store.state.mentor.name }}，这里按风险和时效聚合所有待办。</p></div>
    </div>

    <section class="grid grid-4">
      <article class="stat-card"><span class="stat-icon"><FileCheck2 /></span><div><strong>{{ store.pendingSubmissions.value.length }}</strong><span>待验收成果</span></div></article>
      <article class="stat-card"><span class="stat-icon"><MessageSquareText /></span><div><strong>{{ store.state.reviews.filter(r => r.status === 'submitted').length }}</strong><span>待反馈复盘</span></div></article>
      <article class="stat-card"><span class="stat-icon"><RotateCcw /></span><div><strong>{{ pendingGoals.length }}</strong><span>目标修订</span></div></article>
      <article class="stat-card"><span class="stat-icon"><AlertTriangle /></span><div><strong>{{ store.urgentTasks.value.length }}</strong><span>风险任务</span></div></article>
    </section>

    <section class="card section-gap">
      <div class="card-header"><div><h2>成果验收队列</h2><p>通过后才计入学生正式完成率；退回必须给出补充要求。</p></div><ClipboardCheck /></div>
      <div v-if="!store.pendingSubmissions.value.length" class="notice success-notice">当前没有待验收成果。</div>
      <article v-for="{ task, submission } in store.pendingSubmissions.value" :key="submission.id" class="review-card">
        <div class="review-main">
          <div class="card-header"><div><h3>{{ task.title }}</h3><p>第 {{ submission.version }} 次提交 · {{ new Date(submission.submittedAt).toLocaleString('zh-CN') }}</p></div><StatusBadge tone="amber" label="待验收" /></div>
          <p>{{ submission.content }}</p>
          <div class="evidence"><span v-if="submission.fileNames.length">附件：{{ submission.fileNames.join('、') }}</span><span v-if="submission.links.length">链接：{{ submission.links.join('、') }}</span><span>学生自评：{{ submission.selfRating }}/5</span></div>
          <div v-if="submission.blockers" class="notice">学生阻塞：{{ submission.blockers }}</div>
        </div>
        <div class="review-actions">
          <textarea v-model="comments[submission.id]" placeholder="填写验收意见或补充要求" />
          <div class="actions">
            <button class="btn btn-primary" @click="review(task.id, submission.id, 'accept')"><Check :size="17" />验收通过</button>
            <button class="btn btn-danger" @click="review(task.id, submission.id, 'request_changes')"><X :size="17" />退回补充</button>
          </div>
        </div>
      </article>
    </section>

    <div class="grid mentor-grid section-gap">
      <section class="card">
        <div class="card-header"><div><h2>周期复盘待办</h2></div></div>
        <div v-if="!store.state.reviews.filter(r => r.status === 'submitted').length" class="muted">暂无待反馈复盘。</div>
        <article v-for="review in store.state.reviews.filter(r => r.status === 'submitted')" :key="review.id" class="compact-item">
          <strong>{{ review.period }}</strong><p>完成：{{ review.wins }}</p><p>困难：{{ review.blocker || '未填写' }}</p>
          <div class="field"><textarea v-model="reviewFeedback[review.id]" placeholder="给学生的反馈与下一周期重点" /></div>
          <button class="btn btn-primary" :disabled="!reviewFeedback[review.id]?.trim()" @click="store.feedbackReview(review.id, reviewFeedback[review.id])"><UserRoundCheck :size="17" />提交反馈并关闭复盘</button>
        </article>
      </section>

      <section class="card">
        <div class="card-header"><div><h2>目标修订审核</h2></div></div>
        <div v-if="!pendingGoals.length" class="muted">暂无目标修订申请。</div>
        <article v-for="revision in pendingGoals" :key="revision.id" class="compact-item">
          <strong>{{ revision.oldGoals.join('、') }} → {{ revision.newGoals.join('、') }}</strong>
          <p>{{ revision.reason }}</p>
          <div class="notice">{{ revision.analysis }}</div>
          <div class="actions section-gap"><button class="btn btn-primary" @click="store.reviewGoalRevision(revision.id, true)">通过并生成新 SOP</button><button class="btn btn-secondary" @click="store.reviewGoalRevision(revision.id, false)">驳回</button></div>
        </article>
      </section>
    </div>

    <section class="card section-gap">
      <div class="card-header"><div><h2>学生任务全景</h2><p>{{ store.state.student.name }} · {{ store.state.student.school }}</p></div></div>
      <div class="task-list">
        <div v-for="task in store.state.tasks" :key="task.id" class="task-row">
          <span class="priority-dot" :class="task.priority" />
          <div><h3>{{ task.title }}</h3><p>{{ task.deadline }} 截止 · {{ task.submissions.length }} 次提交</p></div>
          <StatusBadge :tone="task.status === 'accepted' ? 'green' : ['changes_requested','overdue'].includes(task.status) ? 'red' : task.status === 'submitted' ? 'amber' : 'blue'" :label="statusLabel[task.status] || task.status" />
        </div>
      </div>
    </section>

    <DocumentPanel class="section-gap" title="学生资料补充" description="为当前负责学生上传规划分析需要的补充材料。" />
  </div>
</template>

<style scoped>
.review-card { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr); gap: 18px; padding: 18px 0; border-top: 1px solid var(--line); }
.review-card:first-of-type { border-top: 0; }
.review-main p { line-height: 1.6; }
.evidence { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; color: var(--muted); font-size: 12px; }
.review-actions { display: grid; gap: 10px; }
.review-actions textarea { min-height: 100px; padding: 12px; border: 1px solid #c8d7d5; border-radius: 12px; resize: vertical; }
.mentor-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
.compact-item { padding: 15px 0; border-top: 1px solid var(--line); }
.compact-item:first-of-type { border: 0; }
.compact-item p { color: var(--muted); line-height: 1.5; }
@media (max-width: 900px) { .review-card, .mentor-grid { grid-template-columns: 1fr; } }
</style>

