<script setup lang="ts">
import { CreditCard, KeyRound, ShieldCheck } from '@lucide/vue'
import { ref } from 'vue'
import DocumentPanel from '../components/DocumentPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { store } from '../store'

const goalOptions = ['保研/推免', '考研深造', '大满贯毕业', '高质量就业', '出国留学', '考公考编']
const selectedGoals = ref([...store.state.student.goals])
const reason = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
function toggleGoal(goal: string) {
  selectedGoals.value = selectedGoals.value.includes(goal) ? selectedGoals.value.filter(item => item !== goal) : [...selectedGoals.value, goal]
}
function submitRevision() {
  if (!selectedGoals.value.length || !reason.value.trim()) return
  store.submitGoalRevision(selectedGoals.value, reason.value)
  reason.value = ''
}

async function submitPasswordChange() {
  passwordMessage.value = ''
  passwordError.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  try {
    await store.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordMessage.value = '密码已更新，下次登录请使用新密码'
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : '密码修改失败'
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header"><div><h1>我的资料与权限</h1><p>管理目标、卡片和亲情观察授权。</p></div></div>
    <div class="grid profile-layout">
      <section class="grid side-stack">
        <article class="card">
          <div class="card-header"><div><h2>学生档案</h2><p>{{ store.state.student.school }} · {{ store.state.student.college }}</p></div></div>
          <div class="profile-data"><span>姓名</span><strong>{{ store.state.student.name }}</strong><span>专业</span><strong>{{ store.state.student.major }}</strong><span>当前目标</span><strong>{{ store.state.student.goals.join('、') }}</strong><span>SOP</span><strong>{{ store.state.student.sopVersion }}</strong></div>
        </article>
        <article id="goal" class="card">
          <div class="card-header"><div><h2>目标修订</h2><p>提交后由导师评估，当前 SOP 在新版本确认前继续有效。</p></div></div>
          <div class="choice-grid"><button v-for="goal in goalOptions" :key="goal" class="choice" :class="{ active: selectedGoals.includes(goal) }" @click="toggleGoal(goal)">{{ goal }}</button></div>
          <div class="field section-gap"><label>修订原因</label><textarea v-model="reason" placeholder="为什么想调整目标？目前发生了什么变化？" /></div>
          <button class="btn btn-primary section-gap" :disabled="!reason.trim()" @click="submitRevision">提交导师审核</button>
          <div v-for="revision in store.state.goalRevisions" :key="revision.id" class="revision"><div><strong>{{ revision.newGoals.join('、') }}</strong><p>{{ revision.reason }}</p></div><StatusBadge :tone="revision.status === 'approved' ? 'green' : revision.status === 'rejected' ? 'red' : 'amber'" :label="revision.status === 'approved' ? '已通过' : revision.status === 'rejected' ? '已驳回' : '审核中'" /></div>
        </article>
        <DocumentPanel title="我的资料文档" description="补充培养方案、学生手册、成绩或证书材料。" />
      </section>

      <aside class="grid side-stack">
        <section class="card">
          <div class="card-header"><div><h2>我的丫丫卡</h2><p>主卡挂失后，副卡仍可继续使用。</p></div><CreditCard /></div>
          <article v-for="card in store.state.cards" :key="card.idd" class="card-item">
            <div><strong>{{ card.label }}</strong><span>{{ card.idh }} · {{ card.idd }}</span></div>
            <div class="actions"><StatusBadge :tone="card.status === 'active' ? 'green' : 'red'" :label="card.status === 'active' ? '正常' : '已挂失'" /><button class="text-link card-action" @click="store.updateCardStatus(card.idd, card.status === 'active' ? 'lost' : 'active')">{{ card.status === 'active' ? '挂失' : '恢复' }}</button></div>
          </article>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>亲情观察授权</h2><p>家长只能查看你允许的成长摘要。</p></div><ShieldCheck /></div>
          <label class="toggle-row"><div><strong>允许父母亲情卡访问</strong><span>进度、公开荣誉、导师评价摘要</span></div><input :checked="store.state.student.parentConsent" type="checkbox" @change="store.setParentConsent(($event.target as HTMLInputElement).checked)" /></label>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>修改密码</h2><p>学生和家长下次刷卡登录时使用新密码。</p></div><KeyRound /></div>
          <form class="password-form" @submit.prevent="submitPasswordChange">
            <label><span>当前密码</span><input v-model="currentPassword" required minlength="6" type="password" autocomplete="current-password" /></label>
            <label><span>新密码</span><input v-model="newPassword" required minlength="8" type="password" autocomplete="new-password" /></label>
            <label><span>确认新密码</span><input v-model="confirmPassword" required minlength="8" type="password" autocomplete="new-password" /></label>
            <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
            <p v-if="passwordMessage" class="form-success">{{ passwordMessage }}</p>
            <button class="btn btn-primary">保存新密码</button>
          </form>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.profile-layout { grid-template-columns: minmax(0, 1.3fr) minmax(320px, .75fr); align-items: start; }
.side-stack { gap: 18px; }
.profile-data { display: grid; grid-template-columns: 110px 1fr; gap: 13px; }
.profile-data span { color: var(--muted); }
.revision, .card-item { display: flex; justify-content: space-between; gap: 15px; padding: 14px 0; border-top: 1px solid var(--line); }
.revision { margin-top: 18px; }
.revision p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
.card-item strong, .card-item span { display: block; }
.card-item span { margin-top: 4px; color: var(--muted); font-size: 11px; }
.card-action { border: 0; background: transparent; }
.toggle-row { display: flex; justify-content: space-between; gap: 20px; align-items: center; }
.toggle-row strong, .toggle-row span { display: block; }
.toggle-row span { margin-top: 5px; color: var(--muted); font-size: 12px; }
.toggle-row input { width: 22px; height: 22px; accent-color: var(--brand); }
.password-form { display: grid; gap: 12px; }
.password-form label { display: grid; gap: 7px; color: var(--ink); font-weight: 800; }
.password-form label span { font-size: 13px; }
.password-form input { min-height: 42px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; outline: 0; }
.form-error, .form-success { margin: 0; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.form-error { color: #9f1239; background: #fff1f2; }
.form-success { color: #166534; background: #ecfdf5; }
@media (max-width: 900px) { .profile-layout { grid-template-columns: 1fr; } }
</style>

