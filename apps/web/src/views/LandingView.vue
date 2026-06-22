<script setup lang="ts">
import {
  ClipboardList,
  Coins,
  GraduationCap,
  Map,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Target,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showNfcPrompt = ref(false)

const enrollmentSteps = [
  {
    number: '1',
    title: '初见·开启旅程',
    description: '首次触碰 NFC 卡片，录入基础信息，锚定目标方向',
    tags: ['新卡注册', '目标设置'],
  },
  {
    number: '2',
    title: '连接·导师就位',
    description: '系统匹配专属导师，共同确认 SOP 规划方案',
    tags: ['导师匹配', 'SOP 确认'],
  },
  {
    number: '3',
    title: '启程·日常陪跑',
    description: '进入个人仪表盘，日常打卡，查看进度',
    tags: ['每日打卡', '进度追踪'],
  },
]

const features = [
  {
    icon: Map,
    title: '通关地图 SOP',
    description: '按学期拆解任务，红线预警动态迭代。从大一上到毕业设计，每一步都有清晰路径。',
  },
  {
    icon: UsersRound,
    title: '导师天团',
    description: '985/211 博士、大厂高管、金牌竞赛教练。标签化人设，数据化信任，一键预约。',
  },
  {
    icon: Coins,
    title: '奖金对赌',
    description: '0 前期费用，拿奖后分润，透明账单，T+3 结算，用契约精神陪你冲刺成果。',
  },
  {
    icon: Trophy,
    title: '荣誉殿堂',
    description: '成就徽章、排行榜、大满贯毕业生案例。让每一份努力都被看见，被嘉奖。',
  },
  {
    icon: Smartphone,
    title: '全端触达',
    description: 'NFC 碰一碰即达，手机、平板、PC 三端自适应。随时随地查看进度。',
  },
  {
    icon: RefreshCw,
    title: '动态生长',
    description: '目标从 V1.0 到 V2.0 持续迭代。转方向、换赛道，系统始终支持你。',
  },
]

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const idd = (params.get('idd') || params.get('id1') || '').trim()
  const idh = params.get('idh') || params.get('id2') || ''
  if (idd) {
    router.replace({
      path: '/entry',
      query: {
        idd,
        ...(idh ? { idh } : {}),
      },
    })
  }
})

function startJourney() {
  showNfcPrompt.value = true
}
</script>

<template>
  <main class="landing-page">
    <header class="landing-navbar">
      <div class="landing-container nav-inner">
        <RouterLink class="navbar-brand" to="/">
          <img src="/img/yayasmart-logo-5A-FFFFFF.png" alt="笨猫丫丫 Logo" />
          <span>笨猫丫丫 OPC</span>
        </RouterLink>
        <nav class="navbar-links" aria-label="首页入口">
          <button class="nav-link student" @click="startJourney">
            <ClipboardList :size="17" />学生注册
          </button>
          <RouterLink class="nav-link admin" to="/login?mode=staff">
            <ShieldCheck :size="17" />管理员登录
          </RouterLink>
        </nav>
      </div>
    </header>

    <section class="hero-section">
      <div class="landing-container hero-content">
        <h1>一张 NFC 卡片，开启四年学业陪跑</h1>
        <p class="tagline">
          “想到”与“得到”之间，是「笨猫丫丫 OPC」陪你做到。<br />
          从录取通知书到博士毕业，全生命周期动态规划，让成长有路可循。
        </p>
        <div class="hero-pill">
          <Target :size="18" />
          <span>目标锚定 · 导师匹配 · SOP 规划 · 奖金对赌 · 荣誉殿堂</span>
        </div>
        <div class="hero-actions">
          <button class="landing-btn landing-btn-primary" @click="startJourney">
            <ClipboardList :size="19" />立即开启规划
          </button>
          <RouterLink class="landing-btn landing-btn-outline" to="/login?mode=staff">
            <ShieldCheck :size="19" />导师/管理入口
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="cat-showcase" aria-label="笨猫丫丫动画展示">
      <div class="cat-video-wrapper">
        <video autoplay loop muted playsinline preload="auto" poster="/img/yayasmart-logo-3A-1280-1080.png">
          <source src="/mp4/yaya-smart.mp4" type="video/mp4" />
        </video>
      </div>
    </section>

    <section class="enrollment-section">
      <div class="landing-container">
        <h2 class="section-title">入学三部曲</h2>
        <div class="enrollment-steps">
          <article v-for="step in enrollmentSteps" :key="step.title" class="enrollment-step">
            <div class="step-number" :class="`step-${step.number}`">{{ step.number }}</div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
            <div class="step-tags">
              <span v-for="tag in step.tags" :key="tag">{{ tag }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="landing-container">
        <h2 class="section-title">陪跑体系 · 四大引擎</h2>
        <div class="features-grid">
          <article v-for="feature in features" :key="feature.title" class="feature-card">
            <span class="feature-icon"><component :is="feature.icon" :size="34" /></span>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="entry-section">
      <div class="landing-container">
        <h2 class="section-title">快速进入</h2>
        <div class="entry-grid">
          <button class="entry-card" @click="startJourney">
            <span class="card-icon"><GraduationCap :size="39" /></span>
            <h3>学生注册</h3>
            <p>提交学校政策、培养方案、个人目标，AI 自动生成专属《大学通关地图》与战术手册。</p>
            <span class="landing-btn landing-btn-primary">立即注册</span>
          </button>

          <RouterLink class="entry-card admin-card" to="/login?mode=staff">
            <span class="card-icon"><UserRoundCheck :size="39" /></span>
            <h3>管理员登录</h3>
            <p>导师查看学生看板、分配任务、预约管理、奖金结算、数据统计，一站式班级运营。</p>
            <span class="landing-btn admin-btn">进入管理</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-container">
        <div class="brand-tag">
          <img src="/img/yayasmart-logo-5A-FFFFFF.png" alt="笨猫丫丫 Logo" />
          <span>笨猫丫丫 OPC · 外表笨笨，内核聪明</span>
        </div>
        <p>联系客服：<a href="mailto:mall@yayasmart.com">mall@yayasmart.com</a></p>
        <p class="copyright">© 2026 笨猫丫丫 OPC · 学习陪跑系统</p>
      </div>
    </footer>

    <div
      v-if="showNfcPrompt"
      class="nfc-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nfcPromptTitle"
      @click.self="showNfcPrompt = false"
    >
      <div class="nfc-modal-card">
        <div class="nfc-modal-icon"><ClipboardList :size="32" /></div>
        <h2 id="nfcPromptTitle">请碰NFC卡片注册或登录</h2>
        <button class="landing-btn landing-btn-primary" @click="showNfcPrompt = false">我知道了</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  color: #1e293b;
  background: linear-gradient(135deg, #f0f9f8 0%, #f8fafc 100%);
}

.landing-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 12px;
}

.landing-navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 10px 0;
  background: #3d3d3d;
  box-shadow: 0 4px 20px rgba(0, 0, 0, .15);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 1.15rem;
  font-weight: 700;
}

.navbar-brand img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .1);
  padding: 4px;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 999px;
  color: rgba(255, 255, 255, .92);
  background: rgba(255, 255, 255, .08);
  font-size: .95rem;
  font-weight: 700;
  transition: transform .2s ease, background .2s ease, border-color .2s ease;
}

.nav-link:hover {
  transform: translateY(-1px);
  background: #005a53;
  border-color: #005a53;
}

.nav-link.student {
  color: white;
  background: #005a53;
  border-color: #005a53;
  box-shadow: 0 4px 15px rgba(0, 85, 83, .3);
}

.hero-section {
  padding: 50px 0 40px;
  text-align: center;
  background: linear-gradient(145deg, #f0f9f8 0%, #fff 52%, #f8fafc 100%);
}

.hero-content h1 {
  margin-bottom: 16px;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.25;
  font-weight: 850;
  color: #005a53;
}

.tagline {
  max-width: 760px;
  margin: 0 auto 20px;
  padding: 0 12px;
  color: #64748b;
  font-size: clamp(1.05rem, 2.2vw, 1.25rem);
  line-height: 1.7;
}

.hero-pill {
  max-width: max-content;
  margin: 0 auto 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  border: 1px solid rgba(0, 85, 83, .15);
  border-radius: 999px;
  color: #005a53;
  background: rgba(0, 85, 83, .05);
  font-weight: 700;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.landing-btn {
  min-height: 48px;
  min-width: 170px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 34px;
  border: 0;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 800;
  transition: transform .22s ease, box-shadow .22s ease, background .22s ease, color .22s ease;
}

.landing-btn:hover {
  transform: translateY(-2px);
}

.landing-btn-primary {
  color: white;
  background: linear-gradient(135deg, #005a53, #006b66);
  box-shadow: 0 6px 20px rgba(0, 85, 83, .3);
}

.landing-btn-outline {
  color: #005a53;
  background: transparent;
  border: 2px solid #005a53;
}

.landing-btn-outline:hover {
  color: white;
  background: #005a53;
  box-shadow: 0 6px 20px rgba(0, 85, 83, .3);
}

.cat-showcase {
  display: flex;
  justify-content: center;
  padding: 30px 0;
}

.cat-video-wrapper {
  width: 280px;
  height: 210px;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(0, 85, 83, .05), rgba(99, 102, 241, .05));
  box-shadow: 0 15px 40px rgba(0, 0, 0, .1);
}

.cat-video-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.enrollment-section {
  padding: 60px 0;
  background: #f8fafc;
}

.features-section,
.entry-section {
  padding: 40px 0 50px;
}

.section-title {
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #1e293b;
  text-align: center;
  font-size: clamp(1.45rem, 3vw, 1.75rem);
  font-weight: 800;
}

.section-title::before,
.section-title::after {
  content: "";
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #b81f24;
  box-shadow: 14px 0 0 #005a53;
}

.section-title::after {
  box-shadow: -14px 0 0 #005a53;
}

.enrollment-steps,
.features-grid {
  display: grid;
  gap: 24px;
}

.enrollment-steps {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.enrollment-step {
  padding: 24px;
  text-align: center;
}

.step-number {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: white;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(135deg, #005a53, #007570);
}

.step-number.step-2 {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.enrollment-step h3 {
  margin-bottom: 8px;
  color: #1e293b;
  font-size: 1.1rem;
}

.enrollment-step p {
  margin-bottom: 16px;
  color: #64748b;
  font-size: .92rem;
  line-height: 1.6;
}

.step-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.step-tags span {
  padding: 4px 12px;
  border-radius: 999px;
  color: #005a53;
  background: rgba(0, 85, 83, .08);
  font-size: .78rem;
  font-weight: 800;
}

.features-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.feature-card,
.entry-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, .05);
  transition: transform .25s ease, box-shadow .25s ease;
}

.feature-card {
  padding: 28px 24px;
}

.feature-card::before,
.entry-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, #005a53, #007570);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .25s ease;
}

.feature-card:hover,
.entry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .08);
}

.feature-card:hover::before,
.entry-card:hover::before {
  transform: scaleX(1);
}

.feature-icon {
  width: 58px;
  height: 58px;
  margin-bottom: 14px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #005a53;
  background: rgba(0, 85, 83, .08);
}

.feature-card h3 {
  margin-bottom: 10px;
  color: #005a53;
  font-size: 1.25rem;
}

.feature-card p,
.entry-card p {
  margin-bottom: 0;
  color: #64748b;
  line-height: 1.65;
}

.entry-grid {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;
}

.entry-card {
  min-height: 330px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  color: inherit;
}

button.entry-card {
  width: 100%;
  border-color: #e2e8f0;
  font: inherit;
}

.entry-card::before {
  height: 6px;
  transform: scaleX(1);
}

.entry-card.admin-card::before {
  background: linear-gradient(90deg, #475569, #6366f1);
}

.card-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 8px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #005a53;
  background: linear-gradient(135deg, rgba(0, 85, 83, .08), rgba(99, 102, 241, .08));
}

.admin-card .card-icon,
.admin-card h3 {
  color: #4f46e5;
}

.entry-card h3 {
  margin: 0;
  color: #005a53;
  font-size: 1.45rem;
}

.entry-card p {
  max-width: 300px;
  flex: 1;
}

.entry-card .landing-btn {
  width: 100%;
  max-width: 220px;
  margin-top: 8px;
}

.admin-btn {
  color: white;
  background: linear-gradient(135deg, #475569, #6366f1);
  box-shadow: 0 6px 20px rgba(71, 85, 105, .25);
}

.landing-footer {
  padding: 30px 0;
  color: rgba(255, 255, 255, .82);
  background: #3d3d3d;
  text-align: center;
  font-size: .92rem;
}

.landing-footer a {
  color: #4ade80;
}

.brand-tag {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
}

.brand-tag img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.copyright {
  margin: 8px 0 0;
  font-size: .8rem;
  opacity: .72;
}

.nfc-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, .48);
  backdrop-filter: blur(6px);
}

.nfc-modal-card {
  width: min(420px, 100%);
  padding: 34px 28px 30px;
  display: grid;
  justify-items: center;
  gap: 18px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .22);
  text-align: center;
}

.nfc-modal-icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #005a53;
  background: rgba(0, 85, 83, .08);
}

.nfc-modal-card h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.35rem;
}

@media (min-width: 640px) {
  .landing-container {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@media (max-width: 900px) {
  .enrollment-steps,
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .nav-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-section {
    padding-top: 38px;
  }

  .hero-pill {
    align-items: flex-start;
    text-align: left;
    border-radius: 18px;
  }

  .enrollment-steps,
  .features-grid,
  .entry-grid {
    grid-template-columns: 1fr;
  }

  .cat-video-wrapper {
    width: 240px;
    height: 180px;
  }
}

@media (max-width: 440px) {
  .navbar-links,
  .hero-actions {
    width: 100%;
  }

  .nav-link,
  .landing-btn {
    width: 100%;
  }

  .hero-content h1 {
    font-size: 1.75rem;
  }
}
</style>
