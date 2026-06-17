<script setup lang="ts">
import {
  Bell,
  BookOpenCheck,
  Bot,
  ChartNoAxesCombined,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  Home,
  Menu,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store'
import type { Role } from '../types'

const open = ref(false)
const route = useRoute()
const router = useRouter()
const role = computed(() => store.state.currentRole)
const unread = computed(() => store.state.messages.filter((message) => !message.read).length)

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

const roleHome: Record<Role, string> = {
  student: '/dashboard',
  mentor: '/mentor',
  parent: '/parent',
  admin: '/admin',
}

async function switchRole(nextRole: Role) {
  await store.setRole(nextRole)
  open.value = false
  await router.push(roleHome[nextRole])
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
        <RouterLink v-if="role === 'student'" class="message-link" to="/messages">
          <Bell :size="20" />
          <span v-if="unread" class="notification-dot">{{ unread }}</span>
        </RouterLink>
        <div class="role-switch">
          <button :class="{ active: role === 'student' }" @click="switchRole('student')">学生</button>
          <button :class="{ active: role === 'mentor' }" @click="switchRole('mentor')">导师</button>
          <button :class="{ active: role === 'parent' }" @click="switchRole('parent')">家长</button>
          <button :class="{ active: role === 'admin' }" @click="switchRole('admin')">管理</button>
        </div>
      </div>
    </header>

    <aside class="sidebar">
      <button class="icon-btn sidebar-close mobile-only" aria-label="关闭菜单" @click="open = false"><X /></button>
      <div v-if="role === 'student'" class="student-mini">
        <div class="avatar">{{ store.state.student.name.slice(0, 1) }}</div>
        <div>
          <strong>{{ store.state.student.name }}</strong>
          <small>{{ store.state.student.sopVersion }} · {{ store.state.student.grade }}</small>
        </div>
      </div>

      <nav v-if="role === 'student'" class="side-nav">
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

      <nav v-else class="side-nav">
        <RouterLink v-if="role === 'mentor'" to="/mentor" class="active">
          <UsersRound :size="20" />导师工作台
        </RouterLink>
        <RouterLink v-if="role === 'parent'" to="/parent" class="active">
          <HeartHandshake :size="20" />家长观察室
        </RouterLink>
        <RouterLink v-if="role === 'admin'" to="/admin" class="active">
          <Settings :size="20" />系统管理
        </RouterLink>
      </nav>

      <div class="sidebar-tip">
        <Sparkles :size="18" />
        <div>
          <strong>碰一下，继续前进</strong>
          <span>所有演示数据都会保存在当前浏览器。</span>
        </div>
      </div>
    </aside>

    <button v-if="open" class="nav-overlay" aria-label="关闭菜单" @click="open = false" />
    <main class="app-main"><slot /></main>
  </div>
</template>

