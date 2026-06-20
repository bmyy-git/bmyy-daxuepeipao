<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandHero from '../components/BrandHero.vue'
import { store } from '../store'

const router = useRouter()
const route = useRoute()
const step = ref(1)
const activationSessionId = ref('')
const selectedFiles = ref<File[]>([])
const submitting = ref(false)
const error = ref('')
const goals = ['保研/推免', '考研深造', '大满贯毕业', '高质量就业', '出国留学', '考公考编']
const form = reactive({
  name: '',
  phone: '',
  email: '',
  school: '',
  college: '',
  major: '',
  password: '',
  confirmPassword: '',
  goals: [] as string[],
  customGoal: '',
  privacy: false,
})
const passwordReady = computed(() => form.password.length >= 8 && form.password === form.confirmPassword)
const canNext = computed(() =>
  step.value === 1
    ? form.name && form.phone && form.school && form.college && form.major && passwordReady.value
    : form.goals.length,
)

function toggleGoal(goal: string) {
  form.goals = form.goals.includes(goal) ? form.goals.filter((item) => item !== goal) : [...form.goals, goal]
}

onMounted(async () => {
  try {
    const session = await store.createActivationSession(String(route.query.idd || ''), String(route.query.idh || ''))
    activationSessionId.value = session.id
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '无法创建激活会话'
  }
})

function selectFiles(event: Event) {
  selectedFiles.value = Array.from((event.target as HTMLInputElement).files || [])
}

async function submit() {
  if (!form.privacy) return
  submitting.value = true
  error.value = ''
  try {
    for (const file of selectedFiles.value) {
      await store.uploadActivationFile(file, activationSessionId.value)
    }
    const email = form.email.trim()
    const customGoal = form.customGoal.trim()
    await store.activateStudent({
      idd: String(route.query.idd || ''),
      idh: String(route.query.idh || ''),
      activationSessionId: activationSessionId.value,
      name: form.name.trim(),
      phone: form.phone.trim(),
      ...(email ? { email } : {}),
      school: form.school.trim(),
      college: form.college.trim(),
      major: form.major.trim(),
      password: form.password,
      goals: form.goals,
      ...(customGoal ? { customGoal } : {}),
      privacyAgreed: true,
      consentVersion: 'V2.4',
    })
    await router.push('/waiting')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="activation-page">
    <div class="page page-narrow">
      <BrandHero compact title="欢迎开启你的大学旅程" subtitle="用几分钟告诉我们你的方向，导师和丫丫 AI 会一起准备第一版专属攻略。" />
      <div class="stepper">
        <span v-for="n in 3" :key="n" :class="{ active: step >= n }">{{ n }}</span>
      </div>

      <section v-if="step === 1" class="card">
        <div class="card-header"><div><h2>基础信息</h2><p>用于建立你的专属学业档案。</p></div></div>
        <div class="form-grid">
          <div class="field"><label>姓名</label><input v-model="form.name" placeholder="请输入姓名" /></div>
          <div class="field"><label>手机号</label><input v-model="form.phone" type="tel" placeholder="请输入手机号" /></div>
          <div class="field"><label>邮箱</label><input v-model="form.email" type="email" placeholder="选填" /></div>
          <div class="field"><label>大学</label><input v-model="form.school" placeholder="录取院校" /></div>
          <div class="field"><label>学院（二级学院）</label><input v-model="form.college" placeholder="学院名称" /></div>
          <div class="field"><label>专业</label><input v-model="form.major" placeholder="专业名称" /></div>
          <div class="field"><label>登录密码</label><input v-model="form.password" type="password" minlength="8" placeholder="至少 8 位" /></div>
          <div class="field"><label>确认密码</label><input v-model="form.confirmPassword" type="password" minlength="8" placeholder="再次输入密码" /></div>
        </div>
        <div v-if="form.password && !passwordReady" class="notice danger-notice section-gap">请确认两次密码一致，且至少 8 位。</div>
      </section>

      <section v-else-if="step === 2" class="card">
        <div class="card-header"><div><h2>目标锚定</h2><p>可以多选，目标以后也能修订。</p></div></div>
        <div class="choice-grid">
          <button v-for="goal in goals" :key="goal" class="choice" :class="{ active: form.goals.includes(goal) }" @click="toggleGoal(goal)">{{ goal }}</button>
        </div>
        <div class="field section-gap"><label>其他目标</label><input v-model="form.customGoal" placeholder="例如：加入实验室、完成个人作品" /></div>
      </section>

      <section v-else class="card">
        <div class="card-header"><div><h2>资料与授权</h2><p>正式版支持培养方案、学生手册等私有资料上传。</p></div></div>
        <label class="upload-demo">
          <input type="file" multiple @change="selectFiles" />
          <strong>选择资料文件</strong>
          <span>{{ selectedFiles.length ? `已选择 ${selectedFiles.length} 个文件` : 'PDF、Word、JPG、PNG，单文件不超过 20MB' }}</span>
        </label>
        <label class="consent"><input v-model="form.privacy" type="checkbox" /> 我已阅读并同意隐私授权，允许系统为学业规划分析所提交资料。</label>
      </section>

      <div class="actions form-actions">
        <button v-if="step > 1" class="btn btn-secondary" @click="step--">上一步</button>
        <button v-if="step < 3" class="btn btn-primary" :disabled="!canNext" @click="step++">继续</button>
        <button v-else class="btn btn-primary" :disabled="!form.privacy || submitting || !activationSessionId" @click="submit">{{ submitting ? '正在提交...' : '提交并生成专属攻略' }}</button>
      </div>
      <div v-if="error" class="notice danger-notice section-gap">{{ error }}</div>
    </div>
  </main>
</template>

<style scoped>
.activation-page { min-height: 100vh; padding: 24px; background: #f3f7f6; }
.stepper { display: flex; justify-content: center; gap: 60px; margin: 24px 0; }
.stepper span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: #78908d; background: #dfe9e7; font-weight: 800; }
.stepper span.active { color: white; background: var(--brand); }
.upload-demo { min-height: 150px; border: 2px dashed #aac8c4; border-radius: 15px; display: grid; place-content: center; justify-items: center; color: var(--brand); background: #f5fbfa; cursor: pointer; }
.upload-demo input { display: none; }
.upload-demo span { margin-top: 7px; color: var(--muted); font-size: 12px; }
.consent { display: flex; gap: 9px; margin-top: 18px; color: var(--muted); font-size: 13px; line-height: 1.6; }
.form-actions { justify-content: flex-end; margin-top: 18px; }
</style>
