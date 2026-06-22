<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CreditCard, FileText, GraduationCap, Mail, Phone, Star, UsersRound } from '@lucide/vue'
import DocumentPanel from '../components/DocumentPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'
import type { StudentStage } from '../types'

type AdminSection = 'cards' | 'students' | 'teachers' | 'documents'

const route = useRoute()
const section = computed<AdminSection>(() => {
  const value = route.params.section
  return value === 'students' || value === 'teachers' || value === 'documents' ? value : 'cards'
})

const tabs: { key: AdminSection; label: string; to: string; icon: unknown }[] = [
  { key: 'cards', label: '卡片', to: '/admin/cards', icon: CreditCard },
  { key: 'students', label: '学生', to: '/admin/students', icon: GraduationCap },
  { key: 'teachers', label: '老师', to: '/admin/teachers', icon: UsersRound },
  { key: 'documents', label: '文档', to: '/admin/documents', icon: FileText },
]

const stageLabel: Record<StudentStage, string> = {
  activating: '建档中',
  pending_match: '待分配老师',
  mentor_matched: '老师已就位',
  sop_reviewing: 'SOP 确认中',
  active: '陪跑中',
  paused: '暂停',
  graduated: '已毕业',
}

const cardStatusLabel = {
  active: '正常',
  lost: '已挂失',
  replaced: '已换卡',
  revoked: '已停用',
}

const cardTypeLabel = {
  student_primary: '学生主卡',
  student_secondary: '学生副卡',
  parent_family: '亲情卡',
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>系统管理</h1>
        <p>按卡片、学生、老师、文档四张主表分页面维护。</p>
      </div>
    </div>

    <nav class="admin-tabs" aria-label="管理后台子页面">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        :class="{ active: section === tab.key }"
      >
        <component :is="tab.icon" :size="18" />
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>

    <section v-if="section === 'cards'" class="card section-gap">
      <div class="card-header">
        <div>
          <h2>卡片表</h2>
          <p>NFC 物理生命周期独立于学生业务阶段，可单独挂失、换卡和解绑。</p>
        </div>
        <CreditCard />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>卡片</th><th>IDD</th><th>IDH</th><th>类型</th><th>主卡</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="card in store.state.cards" :key="card.idd">
              <td><strong>{{ card.label }}</strong></td>
              <td>{{ card.idd }}</td>
              <td>{{ card.idh }}</td>
              <td>{{ cardTypeLabel[card.type] }}</td>
              <td>{{ card.primary ? '是' : '否' }}</td>
              <td>
                <StatusBadge
                  :tone="card.status === 'active' ? 'green' : 'red'"
                  :label="cardStatusLabel[card.status]"
                />
              </td>
              <td>
                <button
                  class="text-link table-action"
                  @click="store.updateCardStatus(card.idd, card.status === 'active' ? 'lost' : 'active')"
                >
                  {{ card.status === 'active' ? '挂失' : '解挂' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="section === 'students'" class="card section-gap">
      <div class="card-header">
        <div>
          <h2>学生表</h2>
          <p>集中查看学生档案、目标、老师关系和家长授权状态。</p>
        </div>
        <GraduationCap />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>学生</th><th>学校</th><th>学院/专业</th><th>年级</th><th>目标</th><th>阶段</th><th>老师</th><th>家长授权</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{{ store.state.student.name }}</strong></td>
              <td>{{ store.state.student.school || '未填写' }}</td>
              <td>{{ store.state.student.college || '未填写' }} / {{ store.state.student.major || '未填写' }}</td>
              <td>{{ store.state.student.grade }}</td>
              <td>{{ store.state.student.goals.length ? store.state.student.goals.join('、') : '未设置' }}</td>
              <td><StatusBadge tone="blue" :label="stageLabel[store.state.student.stage]" /></td>
              <td>{{ store.state.mentor.name }}</td>
              <td>{{ store.state.student.parentConsent ? '有效' : '未开启' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="section === 'teachers'" class="card section-gap">
      <div class="card-header">
        <div>
          <h2>老师表</h2>
          <p>维护导师、项目老师、辅导员和专属客服的服务信息。</p>
        </div>
        <UsersRound />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>老师</th><th>职称/角色</th><th>擅长方向</th><th>联系方式</th><th>服务人数</th><th>评分</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>{{ store.state.mentor.name }}</strong></td>
              <td>{{ store.state.mentor.title }}</td>
              <td>{{ store.state.mentor.expertise.length ? store.state.mentor.expertise.join('、') : '未填写' }}</td>
              <td>
                <span class="contact-line"><Mail :size="14" />{{ store.state.mentor.email || '未填写' }}</span>
                <span class="contact-line"><Phone :size="14" />{{ store.state.mentor.wechat || '未填写' }}</span>
              </td>
              <td>{{ store.state.mentor.serviceCount }}</td>
              <td><span class="rating"><Star :size="14" />{{ store.state.mentor.rating || '暂无' }}</span></td>
              <td><StatusBadge tone="green" label="启用" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="section-gap">
      <DocumentPanel
        title="文档表"
        description="按学校查看学生补充资料，并下载或删除已归档文档。"
        allow-download
        allow-delete
        allow-school-filter
      />
    </section>

    <div class="notice section-gap">
      当前管理后台通过 JWT 调用 NestJS API。卡片、学生、老师、文档分别作为独立运营对象维护，后续奖金、荣誉、通知和审计可继续扩展为新的子页面。
    </div>
  </div>
</template>

<style scoped>
.admin-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.admin-tabs a {
  min-height: 46px;
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
  background: #fff;
  font-weight: 800;
}
.admin-tabs a.active {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--soft);
}
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td {
  padding: 13px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  white-space: nowrap;
  font-size: 13px;
  vertical-align: middle;
}
th { color: var(--muted); font-size: 11px; text-transform: uppercase; }
.table-action { border: 0; background: transparent; }
.contact-line, .rating { display: flex; align-items: center; gap: 6px; }
.contact-line + .contact-line { margin-top: 5px; }
@media (max-width: 760px) {
  .admin-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
