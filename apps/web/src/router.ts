import { createRouter, createWebHistory } from 'vue-router'
import ActivationView from './views/ActivationView.vue'
import AdminView from './views/AdminView.vue'
import AiView from './views/AiView.vue'
import DashboardView from './views/DashboardView.vue'
import EntryView from './views/EntryView.vue'
import GrowthView from './views/GrowthView.vue'
import LandingView from './views/LandingView.vue'
import LoginView from './views/LoginView.vue'
import MentorReadyView from './views/MentorReadyView.vue'
import MentorView from './views/MentorView.vue'
import MessagesView from './views/MessagesView.vue'
import ParentView from './views/ParentView.vue'
import ProfileView from './views/ProfileView.vue'
import ReviewsView from './views/ReviewsView.vue'
import SopView from './views/SopView.vue'
import TaskDetailView from './views/TaskDetailView.vue'
import TasksView from './views/TasksView.vue'
import WaitingView from './views/WaitingView.vue'
import { getToken } from './api'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: LandingView, meta: { public: true } },
    { path: '/login', component: LoginView, meta: { public: true, bare: true } },
    { path: '/entry', component: EntryView, meta: { public: true } },
    { path: '/activate', component: ActivationView, meta: { public: true, bare: true } },
    { path: '/waiting', component: WaitingView, meta: { bare: true } },
    { path: '/mentor-ready', component: MentorReadyView, meta: { bare: true } },
    { path: '/dashboard', component: DashboardView },
    { path: '/tasks', component: TasksView },
    { path: '/tasks/:id', component: TaskDetailView },
    { path: '/sop', component: SopView },
    { path: '/reviews', component: ReviewsView },
    { path: '/growth', component: GrowthView },
    { path: '/ai', component: AiView },
    { path: '/messages', component: MessagesView },
    { path: '/profile', component: ProfileView },
    { path: '/parent', component: ParentView, meta: { role: 'parent' } },
    { path: '/mentor', component: MentorView, meta: { role: 'mentor' } },
    { path: '/admin', component: AdminView, meta: { role: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public || getToken()) return true
  return { path: '/login', query: { redirect: to.fullPath } }
})
