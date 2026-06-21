<script setup lang="ts">
import { CheckCircle2, FileSearch, UserRoundSearch } from '@lucide/vue'
import BrandHero from '../components/BrandHero.vue'
</script>

<template>
  <main class="activation-page">
    <div class="page page-narrow">
      <BrandHero compact title="导师正在赶来的路上" subtitle="你的资料已安全收到。丫丫 AI 正在整理重点，工作人员也在为你匹配合适的导师。" />
      <section class="card section-gap">
        <div class="process-list">
          <div class="process done"><CheckCircle2 /><div><strong>学生档案已建立</strong><span>基础信息和目标已保存</span></div></div>
          <div class="process active"><FileSearch /><div><strong>资料解析与规划草案</strong><span>SOP V0.1 正在生成</span></div></div>
          <div class="process"><UserRoundSearch /><div><strong>匹配专属导师</strong><span>匹配后会通过短信、邮件和站内消息通知你</span></div></div>
        </div>
        <div class="notice section-gap">资料较多时可能需要多一点时间。你可以先离开，之后再次碰卡会回到当前进度。</div>
        <div class="actions section-gap">
          <RouterLink class="btn btn-primary" to="/dashboard">进入学生端</RouterLink>
          <RouterLink class="btn btn-secondary" to="/">返回首页</RouterLink>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.activation-page { min-height: 100vh; padding: 24px; background: #f3f7f6; }
.process-list { display: grid; gap: 12px; }
.process { display: flex; gap: 14px; align-items: center; padding: 15px; border: 1px solid var(--line); border-radius: 14px; color: #8a9997; }
.process.done, .process.active { color: var(--brand); background: var(--soft); }
.process strong, .process span { display: block; }
.process span { margin-top: 4px; color: var(--muted); font-size: 12px; }
</style>

