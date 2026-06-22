<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CreditCard, KeyRound, LogIn, Mail, ShieldCheck } from '@lucide/vue'
import { store } from '../store'

const route = useRoute()
const router = useRouter()
const mode = ref<'card' | 'staff'>(route.query.mode === 'staff' ? 'staff' : 'card')
function parseNfcParam(value: string, explicitBatchCode = '') {
  const normalized = value.trim()
  const embeddedBatchCode = normalized.length >= 18 ? normalized.slice(14, 18) : ''
  return {
    idd: normalized.length >= 18 ? normalized.slice(0, 14) : normalized,
    batchCode: explicitBatchCode.trim() || embeddedBatchCode || '',
  }
}

const parsedCard = parseNfcParam(
  String(route.query.idd || route.query.cardId || ''),
  String(route.query.batchCode || route.query.batch || ''),
)
const cardId = ref(parsedCard.idd)
const batchCode = ref(parsedCard.batchCode)
const idh = ref(String(route.query.idh || ''))
const cardPassword = ref('')
const identifier = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const title = computed(() => mode.value === 'card' ? '学生 / 家长卡登录' : '导师 / 管理员登录')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const next = mode.value === 'card'
      ? await store.loginWithCard(cardId.value, cardPassword.value, idh.value || undefined, batchCode.value || undefined)
      : await store.loginWithPassword(identifier.value, password.value)
    await router.replace(String(route.query.redirect || next))
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-screen">
    <section class="login-panel">
      <RouterLink class="login-brand" to="/">
        <img src="/img/yayasmart-logo-5A-FFFFFF.png" alt="笨猫丫丫 OPC" />
        <span>笨猫丫丫 OPC</span>
      </RouterLink>

      <div class="login-tabs">
        <button :class="{ active: mode === 'card' }" @click="mode = 'card'">
          <CreditCard :size="18" />卡登录
        </button>
        <button :class="{ active: mode === 'staff' }" @click="mode = 'staff'">
          <ShieldCheck :size="18" />员工登录
        </button>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <div class="card-header">
          <div>
            <h1>{{ title }}</h1>
            <p v-if="mode === 'card'">学生和家长使用 NFC 卡号加密码进入系统。</p>
            <p v-else>导师和管理员使用邮箱或手机号加密码登录。</p>
          </div>
        </div>

        <template v-if="mode === 'card'">
          <label>
            <span>卡号</span>
            <div class="field">
              <CreditCard :size="18" />
              <input v-model.trim="cardId" required autocomplete="username" placeholder="请输入 NFC 卡号" />
            </div>
          </label>
          <label>
            <span>密码</span>
            <div class="field">
              <KeyRound :size="18" />
              <input v-model="cardPassword" required minlength="6" type="password" autocomplete="current-password" placeholder="请输入密码" />
            </div>
          </label>
        </template>

        <template v-else>
          <label>
            <span>邮箱或手机号</span>
            <div class="field">
              <Mail :size="18" />
              <input v-model.trim="identifier" required autocomplete="username" placeholder="mentor@yayasmart.com" />
            </div>
          </label>
          <label>
            <span>密码</span>
            <div class="field">
              <KeyRound :size="18" />
              <input v-model="password" required minlength="6" type="password" autocomplete="current-password" placeholder="请输入密码" />
            </div>
          </label>
        </template>

        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn btn-primary" :disabled="loading">
          <LogIn :size="18" />{{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(145deg, #004b46, #007570);
}
.login-panel {
  width: min(460px, 100%);
  padding: 24px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .22);
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: var(--ink);
  font-weight: 900;
  text-decoration: none;
}
.login-brand img { width: 42px; height: 42px; border-radius: 8px; background: var(--brand); }
.login-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}
.login-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
  color: var(--muted);
  font-weight: 800;
}
.login-tabs button.active { color: white; border-color: var(--brand); background: var(--brand); }
.login-form { display: grid; gap: 16px; }
.login-form label { display: grid; gap: 8px; color: var(--ink); font-weight: 800; }
.login-form label span { font-size: 13px; }
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}
.field svg { color: var(--muted); flex: 0 0 auto; }
.field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--ink);
  font: inherit;
}
.form-error {
  padding: 10px 12px;
  border-radius: 8px;
  color: #9f1239;
  background: #fff1f2;
}
.btn { justify-content: center; }
</style>
