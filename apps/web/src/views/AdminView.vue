<script setup lang="ts">
import { CreditCard, Database, Shield, Users } from '@lucide/vue'
import DocumentPanel from '../components/DocumentPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h1>系统管理</h1><p>NFC 生命周期、角色权限和学生状态概览。</p></div></div>
    <section class="grid grid-4">
      <article class="stat-card"><span class="stat-icon"><CreditCard /></span><div><strong>{{ store.state.cards.length }}</strong><span>已绑定卡片</span></div></article>
      <article class="stat-card"><span class="stat-icon"><Users /></span><div><strong>1</strong><span>活跃学生</span></div></article>
      <article class="stat-card"><span class="stat-icon"><Shield /></span><div><strong>4</strong><span>演示角色</span></div></article>
      <article class="stat-card"><span class="stat-icon"><Database /></span><div><strong>{{ store.state.growth.length }}</strong><span>成长事件</span></div></article>
    </section>

    <section class="card section-gap">
      <div class="card-header"><div><h2>NFC 卡片生命周期</h2><p>卡片状态与学生业务阶段分离管理。</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>卡片</th><th>IDD</th><th>批次</th><th>IDH</th><th>类型</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="card in store.state.cards" :key="card.idd">
              <td><strong>{{ card.label }}</strong></td><td>{{ card.idd }}</td><td>{{ card.batchCode || '-' }}</td><td>{{ card.idh }}</td><td>{{ card.type }}</td>
              <td><StatusBadge :tone="card.status === 'active' ? 'green' : 'red'" :label="card.status === 'active' ? '正常' : '已挂失'" /></td>
              <td><button class="text-link table-action" @click="store.updateCardStatus(card.idd, card.status === 'active' ? 'lost' : 'active')">{{ card.status === 'active' ? '挂失' : '解挂' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="grid admin-grid section-gap">
      <section class="card">
        <div class="card-header"><div><h2>学生状态</h2></div></div>
        <div class="profile-data"><span>学生</span><strong>{{ store.state.student.name }}</strong><span>业务阶段</span><strong>{{ store.state.student.stage }}</strong><span>导师</span><strong>{{ store.state.mentor.name }}</strong><span>SOP</span><strong>{{ store.state.student.sopVersion }}</strong><span>家长授权</span><strong>{{ store.state.student.parentConsent ? '有效' : '已撤回' }}</strong></div>
      </section>
      <section class="card">
        <div class="card-header"><div><h2>基础 RBAC</h2><p>正式服务端需叠加数据范围守卫。</p></div></div>
        <div class="role-list"><span>超级管理员</span><span>管理员</span><span>导师</span><span>项目老师</span><span>辅导员</span><span>学校老师</span><span>专属客服</span><span>学生</span><span>家长</span></div>
      </section>
    </div>
    <DocumentPanel
      class="section-gap"
      title="资料文档管理"
      description="按学校查看学生补充资料，并下载或删除已归档文档。"
      allow-download
      allow-delete
      allow-school-filter
    />
    <div class="notice section-gap">当前页面通过 JWT 调用独立 NestJS API，业务数据保存在 PostgreSQL；文件由后端私有存储，Dify 未配置时使用有明确标识的本地兜底回答。</div>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 13px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; font-size: 13px; }
th { color: var(--muted); font-size: 11px; text-transform: uppercase; }
.table-action { border: 0; background: transparent; }
.admin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.profile-data { display: grid; grid-template-columns: 120px 1fr; gap: 13px; }
.profile-data span { color: var(--muted); }
.role-list { display: flex; flex-wrap: wrap; gap: 8px; }
.role-list span { padding: 8px 11px; border-radius: 99px; color: var(--brand); background: var(--soft); font-size: 12px; font-weight: 700; }
@media (max-width: 760px) { .admin-grid { grid-template-columns: 1fr; } }
</style>

