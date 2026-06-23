<script setup lang="ts">
import {
  Bell,
  BookOpenCheck,
  Bot,
  ChartNoAxesCombined,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  HeartHandshake,
  Home,
  Menu,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  LogOut,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToken } from '../api'
import { store } from '../store'

const open = ref(false)
const route = useRoute()
const router = useRouter()
const role = computed(() => store.state.currentRole)
const authenticated = computed(() => Boolean(getToken()))
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const unread = computed(() => store.state.messages.filter((message) => !message.read).length)
const roleLabel = computed(() => ({
  student: '学生',
  mentor: '导师',
  parent: '家长',
  admin: '管理',
}[role.value]))

const studentNav = [
  { to: '/dashboard', label: '行动首页', icon: Home },
  { to: '/tasks', label: '任务中心', icon: ClipboardCheck },
  { to: '/sop', label: '通关地图', icon: BookOpenCheck },
  { to: '/reviews', label: '周期复盘', icon: ChartNoAxesCombined },
  { to: '/growth', label: '成长档案', icon: GraduationCap },
  { to: '/ai', label: '丫丫 AI', icon: Bot },
  { to: '/messages', label: '消息中心', icon: Bell },
  { to: '/profile', label: '我的资料', icon: UserRound },
]

async function logout() {
  store.logout()
  open.value = false
  await router.push('/login')
}

const isActive = (to: string) => route.path === to || (to !== '/dashboard' && route.path.startsWith(to))
</script>

<template>
  <div class="app-shell" :class="{ 'nav-open': open }">
    <header class="topbar">
      <button class="icon-btn mobile-only" aria-label="打开菜单" @click="open = true"><Menu /></button>
      <RouterLink class="brand" to="/">
        <img src="/img/yayasmart-logo-5A-FFFFFF.png" alt="笨猫丫丫 OPC" />
        <span>笨猫丫丫 OPC</span>
      </RouterLink>
      <div class="topbar-actions">
        <RouterLink v-if="authenticated && role === 'student'" class="message-link" to="/messages">
          <Bell :size="20" />
          <span v-if="unread" class="notification-dot">{{ unread }}</span>
        </RouterLink>
        <template v-if="authenticated">
          <span class="role-pill">{{ roleLabel }}</span>
          <button class="icon-btn" aria-label="退出登录" @click="logout"><LogOut :size="20" /></button>
        </template>
        <RouterLink v-else class="btn btn-secondary top-login" to="/login">登录系统</RouterLink>
      </div>
    </header>

    <aside class="sidebar">
      <button class="icon-btn sidebar-close mobile-only" aria-label="关闭菜单" @click="open = false"><X /></button>
      <div v-if="authenticated && role === 'student'" class="student-mini">
        <div class="avatar">{{ store.state.student.name.slice(0, 1) }}</div>
        <div>
          <strong>{{ store.state.student.name }}</strong>
          <small>{{ store.state.student.sopVersion }} · {{ store.state.student.grade }}</small>
        </div>
      </div>

      <nav v-if="authenticated && role === 'student'" class="side-nav">
        <RouterLink
          v-for="item in studentNav"
          :key="item.to"
          :to="item.to"
          :class="{ active: isActive(item.to) }"
          @click="open = false"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
          <span v-if="item.to === '/messages' && unread" class="nav-count">{{ unread }}</span>
        </RouterLink>
      </nav>

      <nav v-else-if="authenticated && role === 'mentor'" class="side-nav">
        <RouterLink to="/mentor" class="active">
          <UsersRound :size="20" />导师工作台
        </RouterLink>
        <RouterLink to="/account" :class="{ active: isActive('/account') }">
          <UserRound :size="20" />账号安全
        </RouterLink>
      </nav>

      <nav v-else-if="authenticated && role === 'parent'" class="side-nav">
        <RouterLink to="/parent" class="active">
          <HeartHandshake :size="20" />家长观察室
        </RouterLink>
        <RouterLink to="/account" :class="{ active: isActive('/account') }">
          <UserRound :size="20" />账号安全
        </RouterLink>
      </nav>

      <nav v-else-if="authenticated && role === 'admin' && isAdminRoute" class="side-nav">
        <RouterLink to="/admin/cards" :class="{ active: isActive('/admin/cards') }">
          <CreditCard :size="20" />卡片
        </RouterLink>
        <RouterLink to="/admin/students" :class="{ active: isActive('/admin/students') }">
          <GraduationCap :size="20" />学生
        </RouterLink>
        <RouterLink to="/admin/teachers" :class="{ active: isActive('/admin/teachers') }">
          <UsersRound :size="20" />老师
        </RouterLink>
        <RouterLink to="/admin/documents" :class="{ active: isActive('/admin/documents') }">
          <FileText :size="20" />文档
        </RouterLink>
        <RouterLink to="/account" :class="{ active: isActive('/account') }">
          <UserRound :size="20" />账号安全
        </RouterLink>
      </nav>

      <nav v-else-if="authenticated" class="side-nav">
        <RouterLink to="/account" :class="{ active: isActive('/account') }">
          <UserRound :size="20" />账号安全
        </RouterLink>
      </nav>

      <div class="sidebar-tip">
        <Sparkles :size="18" />
        <div>
          <strong>碰一下，继续前进</strong>
          <span>刷卡或账号登录后，系统会同步最新成长记录。</span>
        </div>
      </div>
    </aside>

    <button v-if="open" class="nav-overlay" aria-label="关闭菜单" @click="open = false" />
    <main class="app-main"><slot /></main>
  </div>
</template>

