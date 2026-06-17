<script setup lang="ts">
import { ArrowRight, Filter } from '@lucide/vue'
import { computed, ref } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const filter = ref('all')
const labels: Record<string, string> = { todo: '待开始', doing: '进行中', submitted: '待验收', changes_requested: '待补充', accepted: '已验收', overdue: '已逾期', cancelled: '已取消' }
const tones: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray'> = { todo: 'gray', doing: 'blue', submitted: 'amber', changes_requested: 'red', accepted: 'green', overdue: 'red', cancelled: 'gray' }
const tasks = computed(() => filter.value === 'all' ? store.state.tasks : store.state.tasks.filter(task => task.status === filter.value))
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div><h1>任务中心</h1><p>任务只有通过导师验收后，才计入正式完成率。</p></div>
      <div class="actions"><Filter :size="18" /><select v-model="filter" class="filter-select"><option value="all">全部状态</option><option value="changes_requested">待补充</option><option value="submitted">待验收</option><option value="doing">进行中</option><option value="accepted">已验收</option></select></div>
    </div>
    <section class="card">
      <div class="task-list">
        <RouterLink v-for="task in tasks" :key="task.id" :to="`/tasks/${task.id}`" class="task-row">
          <span class="priority-dot" :class="task.priority" />
          <div>
            <h3>{{ task.title }}</h3>
            <p>{{ task.description }}</p>
            <div class="task-meta">
              <StatusBadge :tone="tones[task.status]" :label="labels[task.status]" />
              <span class="muted">{{ task.category }} · {{ task.deadline }} 截止</span>
            </div>
          </div>
          <ArrowRight :size="19" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.filter-select { border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; background: white; }
</style>

