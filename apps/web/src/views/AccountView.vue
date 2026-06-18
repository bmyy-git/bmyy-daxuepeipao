<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import { ref } from 'vue'
import { store } from '../store'

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')

async function submit() {
  message.value = ''
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  try {
    await store.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    message.value = '密码已更新，下次登录请使用新密码'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '密码修改失败'
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><div><h1>账号安全</h1><p>定期更新密码，保护账号和学生隐私数据。</p></div></div>
    <section class="card">
      <div class="card-header"><div><h2>修改密码</h2><p>新密码至少 8 位。</p></div><KeyRound /></div>
      <form class="password-form" @submit.prevent="submit">
        <label><span>当前密码</span><input v-model="currentPassword" required minlength="6" type="password" autocomplete="current-password" /></label>
        <label><span>新密码</span><input v-model="newPassword" required minlength="8" type="password" autocomplete="new-password" /></label>
        <label><span>确认新密码</span><input v-model="confirmPassword" required minlength="8" type="password" autocomplete="new-password" /></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="message" class="form-success">{{ message }}</p>
        <button class="btn btn-primary">保存新密码</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.password-form { display: grid; gap: 14px; }
.password-form label { display: grid; gap: 7px; color: var(--ink); font-weight: 800; }
.password-form label span { font-size: 13px; }
.password-form input { min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; outline: 0; }
.form-error, .form-success { margin: 0; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.form-error { color: #9f1239; background: #fff1f2; }
.form-success { color: #166534; background: #ecfdf5; }
</style>
