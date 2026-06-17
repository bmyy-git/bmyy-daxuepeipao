<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Clock3, FileText, Link as LinkIcon, Send } from '@lucide/vue'
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const route = useRoute()
const task = computed(() => store.state.tasks.find(item => item.id === route.params.id))
const form = reactive({ content: '', link: '', fileName: '', selfRating: 4, blockers: '' })
const latest = computed(() => task.value?.submissions.at(-1))
function submit() {
  if (!task.value || !form.content.trim()) return
  store.submitTask(task.value.id, {
    content: form.content,
    links: form.link ? [form.link] : [],
    fileNames: form.fileName ? [form.fileName] : [],
    selfRating: form.selfRating,
    blockers: form.blockers,
  })
  form.content = ''; form.link = ''; form.fileName = ''; form.blockers = ''
}
</script>

<template>
  <div v-if="task" class="page page-narrow">
    <RouterLink class="text-link back-link" to="/tasks"><ArrowLeft :size="17" />返回任务中心</RouterLink>
    <section class="card section-gap">
      <div class="card-header">
        <div><StatusBadge :tone="task.status === 'accepted' ? 'green' : task.status === 'changes_requested' ? 'red' : task.status === 'submitted' ? 'amber' : 'blue'" :label="task.status === 'accepted' ? '已验收' : task.status === 'changes_requested' ? '待补充' : task.status === 'submitted' ? '待导师验收' : '进行中'" /><h1 class="task-title">{{ task.title }}</h1><p>{{ task.category }} · {{ task.semester }}</p></div>
      </div>
      <p class="task-description">{{ task.description }}</p>
      <div class="meta-grid">
        <div><Clock3 /><span>截止时间</span><strong>{{ task.deadline }}</strong></div>
        <div><FileText /><span>导师备注</span><strong>{{ task.mentorNote }}</strong></div>
      </div>
      <div class="divider" />
      <h3>完成标准</h3>
      <ul class="criteria"><li v-for="item in task.criteria" :key="item"><CheckCircle2 :size="18" />{{ item }}</li></ul>
    </section>

    <section v-if="latest" class="card">
      <div class="card-header"><div><h2>最近一次提交 · V{{ latest.version }}</h2><p>{{ new Date(latest.submittedAt).toLocaleString('zh-CN') }}</p></div><StatusBadge :tone="latest.status === 'accepted' ? 'green' : latest.status === 'changes_requested' ? 'red' : 'amber'" :label="latest.status === 'accepted' ? '验收通过' : latest.status === 'changes_requested' ? '需要补充' : '等待验收'" /></div>
      <p>{{ latest.content }}</p>
      <p v-if="latest.fileNames.length" class="muted">附件：{{ latest.fileNames.join('、') }}</p>
      <p v-if="latest.links.length" class="muted">链接：{{ latest.links.join('、') }}</p>
      <div v-if="latest.reviewComment" class="notice" :class="latest.status === 'accepted' ? 'success-notice' : 'danger-notice'"><strong>导师反馈：</strong>{{ latest.reviewComment }}</div>
    </section>

    <section v-if="!['submitted', 'accepted'].includes(task.status)" class="card">
      <div class="card-header"><div><h2>{{ task.status === 'changes_requested' ? '补充成果' : '提交成果' }}</h2><p>文字、文件和链接会形成可追溯的提交版本。</p></div></div>
      <div class="form-grid">
        <div class="field full"><label>成果说明</label><textarea v-model="form.content" placeholder="说明你完成了什么、结果如何，以及还有哪些问题。" /></div>
        <div class="field"><label><LinkIcon :size="14" /> 证据链接</label><input v-model="form.link" placeholder="代码仓库、在线文档等" /></div>
        <div class="field"><label>附件名称</label><input v-model="form.fileName" placeholder="演示模式填写文件名" /></div>
        <div class="field"><label>自评（1-5）</label><input v-model.number="form.selfRating" type="number" min="1" max="5" /></div>
        <div class="field"><label>遇到的阻塞</label><input v-model="form.blockers" placeholder="没有可留空" /></div>
      </div>
      <button class="btn btn-primary section-gap" :disabled="!form.content.trim()" @click="submit"><Send :size="17" />提交导师验收</button>
    </section>
  </div>
</template>

<style scoped>
.back-link { display: inline-flex; align-items: center; gap: 6px; }
.task-title { margin: 12px 0 6px; }
.task-description { color: #405653; line-height: 1.75; }
.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.meta-grid > div { padding: 13px; border-radius: 13px; display: grid; grid-template-columns: auto 1fr; gap: 5px 9px; align-items: center; background: var(--soft); }
.meta-grid svg { grid-row: 1 / 3; color: var(--brand); }
.meta-grid span { color: var(--muted); font-size: 11px; }
.meta-grid strong { font-size: 13px; }
.criteria { display: grid; gap: 10px; padding: 0; list-style: none; }
.criteria li { display: flex; gap: 9px; align-items: center; color: #405653; }
.criteria svg { color: var(--brand); }
.field label { display: flex; align-items: center; gap: 5px; }
@media (max-width: 600px) { .meta-grid { grid-template-columns: 1fr; } }
</style>

