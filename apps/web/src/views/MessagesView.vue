<script setup lang="ts">
import { Bell, Heart, MessageSquareText } from '@lucide/vue'
import { store } from '../store'
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><div><h1>消息中心</h1><p>导师反馈、系统提醒和家人鼓励都在这里。</p></div></div>
    <section class="card">
      <div class="message-list">
        <article v-for="message in store.state.messages" :key="message.id" class="message" :class="{ unread: !message.read }" @click="store.markMessageRead(message.id)">
          <span class="message-icon"><Heart v-if="message.from === 'parent'" /><MessageSquareText v-else-if="message.from === 'mentor'" /><Bell v-else /></span>
          <div><div class="message-title"><strong>{{ message.title }}</strong><small>{{ message.date }}</small></div><p>{{ message.content }}</p></div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.message-list { display: grid; gap: 10px; }
.message { display: grid; grid-template-columns: auto 1fr; gap: 13px; padding: 15px; border-radius: 14px; cursor: pointer; }
.message.unread { background: var(--soft); }
.message-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; color: var(--brand); background: white; }
.message-title { display: flex; justify-content: space-between; gap: 15px; }
.message-title small { color: var(--muted); }
.message p { margin: 6px 0 0; color: var(--muted); line-height: 1.55; }
</style>

