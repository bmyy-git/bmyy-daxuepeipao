<script setup lang="ts">
import { Bot, Send, UserRound } from '@lucide/vue'
import { nextTick, ref } from 'vue'
import { store } from '../store'

const question = ref('')
const localAnswer = ref('')
async function ask(value?: string) {
  const q = value || question.value
  if (!q.trim()) return
  localAnswer.value = store.askAi(q)
  question.value = ''
  await nextTick()
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><div><h1>丫丫 AI 助手</h1><p>回答会结合当前 SOP，并区分资料依据与系统建议。</p></div></div>
    <div class="notice">政策、升学资格和奖金金额等高风险内容，请以学校正式文件和导师确认结果为准。</div>
    <section class="card section-gap chat">
      <div class="bubble ai"><Bot /><div><strong>今天想先解决什么问题？</strong><p>我可以帮你梳理规则、拆解行动，也可以把复杂问题转给导师。</p></div></div>
      <template v-for="item in store.state.aiHistory" :key="item.id">
        <div class="bubble user"><UserRound /><div><p>{{ item.question }}</p></div></div>
        <div class="bubble ai"><Bot /><div><p>{{ item.answer }}</p><small>参考：{{ item.sources.join('、') }}</small></div></div>
      </template>
      <div class="suggestions">
        <button @click="ask('我大一想保研，当前应该优先做什么？')">保研应该优先做什么？</button>
        <button @click="ask('我有被退回的任务，今天该怎么安排？')">今天该怎么安排？</button>
      </div>
      <div class="chat-input"><textarea v-model="question" placeholder="输入你的问题..." @keydown.ctrl.enter="ask()" /><button class="btn btn-primary" :disabled="!question.trim()" @click="ask()"><Send :size="18" /></button></div>
    </section>
  </div>
</template>

<style scoped>
.chat { display: grid; gap: 16px; }
.bubble { display: flex; align-items: flex-start; gap: 10px; }
.bubble > svg { flex: 0 0 auto; width: 34px; height: 34px; padding: 8px; border-radius: 10px; color: var(--brand); background: var(--soft); }
.bubble > div { max-width: 82%; padding: 13px 15px; border-radius: 5px 15px 15px; background: #f0f5f4; }
.bubble.user { flex-direction: row-reverse; }
.bubble.user > div { color: white; border-radius: 15px 5px 15px 15px; background: var(--brand); }
.bubble p { margin: 0; line-height: 1.65; }
.bubble small { display: block; margin-top: 9px; color: var(--muted); }
.suggestions { display: flex; flex-wrap: wrap; gap: 8px; }
.suggestions button { padding: 8px 11px; border: 1px solid #b8cecb; border-radius: 99px; color: var(--brand); background: white; }
.chat-input { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
.chat-input textarea { min-height: 75px; padding: 12px; border: 1px solid #c8d7d5; border-radius: 13px; resize: none; }
</style>

