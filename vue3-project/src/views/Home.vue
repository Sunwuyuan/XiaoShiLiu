<template>
  <div class="home" ref="homeRef">
    <!-- 全局鼠标跟随光晕 -->
    <div class="cursor-glow" ref="cursorGlow"></div>

    <!-- 浮动粒子背景 -->
    <div class="particles" ref="particlesContainer"></div>

    <!-- 导航栏 -->
    <nav class="nav">
      <div class="nav-inner">
        <div class="nav-logo">
          <img :src="logoUrl" alt="Dynamic Network" class="nav-logo-img" />
          <span class="nav-title">Dynamic Network</span>
        </div>
        <div class="nav-links">
          <a href="#projects" class="nav-link">项目</a>
          <a href="#partners" class="nav-link">合作伙伴</a>
          <a href="https://dy.ci" class="nav-link" target="_blank">悦社</a>
          <a href="https://developer.dy.ci" class="nav-link" target="_blank">开发者</a>
        </div>
        <div class="nav-actions">
          <a href="../explore" class="btn-primary" target="_blank">登录</a>
        </div>
      </div>
    </nav>

    <!-- Hero 区域 -->
    <section class="hero">
      <!-- 动态点阵网格 -->
      <div class="dot-grid" ref="dotGrid"></div>
      <!-- 背景光晕 -->
      <div class="hero-orb orb-1"></div>
      <div class="hero-orb orb-2"></div>
      
      <div class="hero-content">
        <div class="hero-logo-wrap" :class="{ 'animate-in': visible }">
          <img :src="logoUrl" alt="Dynamic Network" class="hero-logo-img" />
        </div>
        <h1 class="hero-title" :class="{ 'animate-in': visible }">
          <span class="title-line">Dynamic</span>
          <span class="title-line title-accent">Network</span>
        </h1>
        <p class="hero-desc" :class="{ 'animate-in': visible }">
          构建数字世界的动态网络。从认证、社区到开源游戏，
          <br class="hide-mobile" />
          连接每一个创造者与开发者。
        </p>
        <div class="hero-actions" :class="{ 'animate-in': visible }">
          <a href="/explore" class="btn-ghost btn-lg">
            <span>进入悦社</span>
          </a>
          <a href="#projects" class="btn-primary btn-lg">
            <span>探索项目</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
      
      <!-- 滚动指示器 -->
      <div class="scroll-hint" :class="{ 'animate-in': visible }">
        <div class="scroll-mouse">
          <div class="scroll-wheel"></div>
        </div>
      </div>
    </section>

    <!-- 核心项目 -->
    <section class="projects" id="projects">
      <div class="section-header" :class="{ 'animate-in': projectsVisible }">
        <div class="section-tag">核心生态</div>
        <h2 class="section-title">核心项目</h2>
        <p class="section-desc">覆盖认证、社区、开发、游戏的全栈生态</p>
      </div>
      <div class="projects-grid">
        <a
          v-for="(project, i) in coreProjects"
          :key="project.name"
          :href="project.url"
          class="project-card"
          :class="{ 'animate-in': projectsVisible }"
          :style="{ transitionDelay: `${i * 120}ms` }"
          target="_blank"
          rel="noopener"
          @mousemove="onCardMove"
          @mouseleave="onCardLeave"
        >
          <div class="card-shine"></div>
          <div class="project-icon" :style="{ background: project.iconBg }">
            <span class="project-icon-text">{{ project.abbr }}</span>
          </div>
          <div class="project-info">
            <h3 class="project-name">{{ project.name }}</h3>
            <p class="project-desc">{{ project.desc }}</p>
          </div>
          <div class="project-url">{{ project.displayUrl }}</div>
          <svg class="project-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- OSGames -->
    <section class="osg-section">
      <div class="section-header" :class="{ 'animate-in': osgVisible }">
        <div class="osg-badge">
          <span class="pulse-dot"></span>
          <span>Dynamic Open-Source Games</span>
        </div>
        <h2 class="section-title">OSGames 开源游戏系列</h2>
        <p class="section-desc">开源、自由、好玩的游戏生态</p>
      </div>
      <div class="osg-grid">
        <a
          v-for="(game, i) in osgames"
          :key="game.name"
          :href="game.url"
          class="osg-card"
          :class="{ 'animate-in': osgVisible }"
          :style="{ transitionDelay: `${i * 100}ms` }"
          target="_blank"
          rel="noopener"
          @mousemove="onCardMove"
          @mouseleave="onCardLeave"
        >
          <div class="card-shine"></div>
          <div class="osg-card-header">
            <svg class="osg-card-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="game.svg"></svg>
            <span class="osg-card-tag">{{ game.tag }}</span>
          </div>
          <h3 class="osg-card-name">{{ game.name }}</h3>
          <p class="osg-card-desc">{{ game.desc }}</p>
          <div class="osg-card-url">{{ game.displayUrl }}</div>
        </a>
      </div>
    </section>

    <!-- 合作伙伴 -->
    <section class="partners" id="partners">
      <div class="section-header" :class="{ 'animate-in': partnersVisible }">
        <div class="section-tag">生态伙伴</div>
        <h2 class="section-title">合作伙伴</h2>
        <p class="section-desc">与优秀的团队共同前行</p>
      </div>
      <div class="partners-grid">
        <div
          v-for="(partner, i) in partners"
          :key="partner.name"
          class="partner-card"
          :class="{ 'animate-in': partnersVisible }"
          :style="{ transitionDelay: `${i * 120}ms` }"
          @mousemove="onCardMove"
          @mouseleave="onCardLeave"
        >
          <div class="card-shine"></div>
          <div class="partner-icon" :style="{ background: partner.iconBg }">
            <span class="partner-icon-text">{{ partner.abbr }}</span>
          </div>
          <h3 class="partner-name">{{ partner.name }}</h3>
          <p class="partner-desc">{{ partner.desc }}</p>
          <span v-if="partner.tag" class="partner-tag">{{ partner.tag }}</span>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta" :class="{ 'animate-in': ctaVisible }">
      <div class="cta-orb"></div>
      <h2 class="cta-title">加入 Dynamic Network</h2>
      <p class="cta-desc">探索我们的项目，或使用统一账号畅享全部服务</p>
      <div class="cta-actions">
        <a href="https://auth.yun" class="btn-primary btn-lg" target="_blank" rel="noopener">
          <span>统一登录</span>
        </a>
        <a href="/explore" class="btn-ghost btn-lg">
          <span>进入悦社</span>
        </a>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-left">
          <img :src="logoUrl" alt="Dynamic Network" class="footer-logo" />
          <span class="footer-brand">Dynamic Network</span>
        </div>
        <div class="footer-links">
          <a href="https://auth.yun" target="_blank" rel="noopener">认证中心</a>
          <a href="https://dy.ci" target="_blank" rel="noopener">悦社</a>
          <a href="https://developer.dy.ci" target="_blank" rel="noopener">开发者平台</a>
          <a href="https://osgame.net" target="_blank" rel="noopener">OSGames</a>
        </div>
        <p class="footer-copy">&copy; {{ year }} Dynamic Network. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const homeRef = ref(null)
const cursorGlow = ref(null)
const dotGrid = ref(null)
const particlesContainer = ref(null)
const visible = ref(false)
const projectsVisible = ref(false)
const osgVisible = ref(false)
const partnersVisible = ref(false)
const ctaVisible = ref(false)

const year = new Date().getFullYear()
const isDark = ref(false)

const logoUrl = computed(() =>
  isDark.value
    ? 'https://fs.dy.ci/d/official/icons/logo-big/82030114-d936-4840-be76-562461fb9454_removalai_preview_1200x600.png'
    : 'https://fs.dy.ci/d/official/icons/logo-big/00b2d89c-0b94-43f2-b8a6-35c1a1cce61d_removalai_preview_1200x600.png'
)

// 鼠标跟随光晕
let rafId = null
let targetX = 0
let targetY = 0
let currentX = 0
let currentY = 0

const animateGlow = () => {
  currentX += (targetX - currentX) * 0.08
  currentY += (targetY - currentY) * 0.08
  if (cursorGlow.value) {
    cursorGlow.value.style.setProperty('--glow-x', `${currentX}px`)
    cursorGlow.value.style.setProperty('--glow-y', `${currentY}px`)
  }
  rafId = requestAnimationFrame(animateGlow)
}

const onMouseMove = (e) => {
  targetX = e.clientX
  targetY = e.clientY
}

// 卡片 3D 倾斜 + 擦亮效果
const onCardMove = (e) => {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const rotateX = (y - centerY) / 20
  const rotateY = (centerX - x) / 20
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px) scale(1.02)`
  
  const shine = card.querySelector('.card-shine')
  if (shine) {
    shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(29,155,240,0.2) 0%, transparent 50%)`
    shine.style.opacity = '1'
  }
}

const onCardLeave = (e) => {
  const card = e.currentTarget
  card.style.transform = ''
  const shine = card.querySelector('.card-shine')
  if (shine) {
    shine.style.opacity = '0'
  }
}

// 生成点阵网格
const generateDotGrid = () => {
  if (!dotGrid.value) return
  const cols = Math.ceil(window.innerWidth / 32)
  const rows = Math.ceil(window.innerHeight / 32)
  let html = ''
  for (let i = 0; i < rows * cols; i++) {
    const delay = Math.random() * 4
    const duration = 2 + Math.random() * 3
    html += `<div class="dot" style="animation-delay:${delay}s;animation-duration:${duration}s"></div>`
  }
  dotGrid.value.innerHTML = html
  dotGrid.value.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
}

// 生成浮动粒子
const generateParticles = () => {
  if (!particlesContainer.value) return
  const count = 30
  let html = ''
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100
    const delay = Math.random() * 20
    const duration = 15 + Math.random() * 20
    const size = 2 + Math.random() * 4
    html += `<div class="particle" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;width:${size}px;height:${size}px"></div>`
  }
  particlesContainer.value.innerHTML = html
}

const coreProjects = [
  {
    name: '云认证',
    abbr: 'Auth',
    desc: 'DN 统一账号管理中心，基于 Logto 构建，为全生态提供安全认证服务',
    url: 'https://auth.yun',
    displayUrl: 'auth.yun',
    iconBg: 'rgba(29, 155, 240, 0.12)'
  },
  {
    name: '悦社',
    abbr: 'YS',
    desc: 'DN 的动态社区平台，图文笔记、视频分享、社交互动',
    url: 'https://dy.ci',
    displayUrl: 'dy.ci',
    iconBg: 'rgba(29, 155, 240, 0.12)'
  },
  {
    name: '开发者平台',
    abbr: 'Dev',
    desc: 'DN 开发者平台，提供 API 文档、开发工具和技术支持',
    url: 'https://developer.dy.ci',
    displayUrl: 'developer.dy.ci',
    iconBg: 'rgba(29, 155, 240, 0.12)'
  }
]

const osgames = [
  {
    name: '开源游戏仓库',
    svg: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    tag: '代码仓库',
    desc: 'OSGames 开源游戏代码仓库，所有游戏源码公开托管',
    url: 'https://osgame.net',
    displayUrl: 'osgame.net'
  },
  {
    name: '开源游戏中心',
    svg: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    tag: '游戏平台',
    desc: '在线游戏中心，直接在浏览器中体验开源游戏',
    url: 'https://osgam.es',
    displayUrl: 'osgam.es'
  },
  {
    name: '开源游戏博客',
    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    tag: '技术博客',
    desc: '游戏开发教程、技术分享与团队动态',
    url: 'https://www.osgames.cn',
    displayUrl: 'www.osgames.cn'
  }
]

const partners = [
  {
    name: '3Low Games',
    abbr: '3L',
    desc: '三微游戏，DN 的游戏开发合作伙伴',
    tag: '游戏开发',
    iconBg: 'rgba(29, 155, 240, 0.12)'
  },
  {
    name: '灵阁',
    abbr: '灵',
    desc: '专注游戏开发与 AI 研究的组织',
    tag: '组织',
    iconBg: 'rgba(29, 155, 240, 0.12)'
  }
]

let themeObserver = null
let scrollObserver = null

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true
  })

  const checkTheme = () => {
    isDark.value = document.documentElement.getAttribute('data-theme') === 'dark'
  }
  checkTheme()
  themeObserver = new MutationObserver(checkTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })

  window.addEventListener('mousemove', onMouseMove)
  rafId = requestAnimationFrame(animateGlow)

  generateDotGrid()
  window.addEventListener('resize', generateDotGrid)

  generateParticles()

  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('projects')) projectsVisible.value = true
          if (entry.target.classList.contains('osg-section')) osgVisible.value = true
          if (entry.target.classList.contains('partners')) partnersVisible.value = true
          if (entry.target.classList.contains('cta')) ctaVisible.value = true
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.projects, .osg-section, .partners, .cta').forEach((s) => {
    scrollObserver.observe(s)
  })
})

onUnmounted(() => {
  if (themeObserver) themeObserver.disconnect()
  if (scrollObserver) scrollObserver.disconnect()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', generateDotGrid)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
/* ===== 基础 ===== */
.home {
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  overflow-x: hidden;
  min-height: 100vh;
  position: relative;
}

/* ===== 鼠标跟随光晕 ===== */
.cursor-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.cursor-glow::before {
  content: '';
  position: absolute;
  left: var(--glow-x, 50%);
  top: var(--glow-y, 50%);
  width: 600px;
  height: 600px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, var(--primary-color) 0%, transparent 65%);
  opacity: 0.06;
  transition: opacity 0.3s ease;
}

[data-theme="dark"] .cursor-glow::before {
  opacity: 0.12;
}

/* ===== 浮动粒子 ===== */
.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  background: var(--primary-color);
  opacity: 0.3;
  animation: float-up linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.1;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

/* ===== 导航栏 ===== */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  background: var(--bg-color-primary);
  border-bottom: 1px solid var(--border-color-primary);
}

.nav-inner {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-color-primary);
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.nav-logo-img {
  height: 28px;
  width: auto;
  object-fit: contain;
}

/* 中间导航链接 - 绝对居中 */
.nav-links {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--text-color-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text-color-primary);
  background: var(--bg-color-tertiary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== 按钮 ===== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
}

.btn-primary:hover {
  background: var(--primary-color-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--primary-color-shadow);
}

.btn-lg {
  padding: 14px 28px;
  font-size: 16px;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-secondary);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
}

.btn-ghost:hover {
  background: var(--bg-color-tertiary);
  border-color: var(--text-color-tertiary);
}

.btn-lg.btn-ghost {
  padding: 14px 28px;
  font-size: 16px;
}

/* ===== Hero ===== */
.hero {
  position: relative;
  padding: 160px 24px 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
}

/* 动态点阵网格 */
.dot-grid {
  position: absolute;
  inset: 0;
  display: grid;
  z-index: 0;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 70%);
}

.dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--text-color-tertiary);
  justify-self: center;
  align-self: center;
  animation: dot-pulse ease-in-out infinite;
  opacity: 0.2;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

/* 背景光球 */
.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: var(--primary-color);
  opacity: 0.06;
  top: 10%;
  left: 20%;
  animation: orb-float 8s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: var(--primary-color);
  opacity: 0.04;
  bottom: 10%;
  right: 15%;
  animation: orb-float 10s ease-in-out infinite reverse;
}

@keyframes orb-float {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(30px, -30px); }
  66% { transform: translate(-20px, 20px); }
}

.hero-content {
  position: relative;
  max-width: 720px;
  text-align: center;
  z-index: 2;
}

.hero-logo-wrap {
  margin-bottom: 32px;
  opacity: 0;
  transform: translateY(30px) scale(0.9);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-logo-img {
  height: 100px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 40px var(--primary-color-shadow));
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
}

.title-line {
  display: block;
  color: var(--text-color-primary);
}

.title-accent {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 4s ease-in-out infinite;
}

@keyframes gradient-shift {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(10deg); }
}

.hero-desc {
  font-size: 18px;
  line-height: 1.7;
  color: var(--text-color-secondary);
  margin-bottom: 40px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
}

/* 滚动提示 - 居中 */
.scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  opacity: 0;
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s;
}

.scroll-mouse {
  width: 24px;
  height: 40px;
  border: 2px solid var(--text-color-tertiary);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.scroll-wheel {
  width: 4px;
  height: 8px;
  background: var(--text-color-tertiary);
  border-radius: 2px;
  animation: scroll-bounce 2s ease-in-out infinite;
}

@keyframes scroll-bounce {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(8px); opacity: 0.3; }
}

/* ===== 动画入场 ===== */
.animate-in {
  opacity: 1 !important;
  transform: translateY(0) scale(1) !important;
}

/* ===== Section 通用 ===== */
.section-header {
  text-align: center;
  margin-bottom: 64px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.section-tag {
  display: inline-flex;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--border-color-secondary);
  background: var(--bg-color-secondary);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-secondary);
  margin-bottom: 16px;
}

.section-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.section-desc {
  font-size: 16px;
  color: var(--text-color-secondary);
}

/* ===== 核心项目 ===== */
.projects {
  padding: 100px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.project-card {
  display: flex;
  flex-direction: column;
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(30px);
  position: relative;
  overflow: hidden;
  will-change: transform;
}

.project-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.project-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 40px var(--primary-color-shadow), 0 8px 32px var(--shadow-color);
}

/* 卡片擦亮效果 */
.card-shine {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: 20px;
  z-index: 1;
}

.project-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-bottom: 20px;
  font-weight: 700;
  font-size: 18px;
  border: 1px solid var(--border-color-secondary);
  position: relative;
  z-index: 2;
}

.project-info {
  flex: 1;
  position: relative;
  z-index: 2;
}

.project-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
}

.project-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-color-secondary);
  margin-bottom: 20px;
}

.project-url {
  font-size: 13px;
  color: var(--text-color-tertiary);
  font-family: 'Courier New', monospace;
  position: relative;
  z-index: 2;
}

.project-arrow {
  position: absolute;
  top: 32px;
  right: 32px;
  color: var(--primary-color);
  opacity: 0;
  transform: translate(-4px, 4px);
  transition: all 0.3s ease;
  z-index: 2;
}

.project-card:hover .project-arrow {
  opacity: 1;
  transform: translate(0, 0);
}

/* ===== OSGames ===== */
.osg-section {
  padding: 80px 24px 100px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.osg-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--border-color-secondary);
  background: var(--bg-color-secondary);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-secondary);
  margin-bottom: 16px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--primary-color-shadow); }
  50% { opacity: 0.6; box-shadow: 0 0 0 6px transparent; }
}

.osg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.osg-card {
  display: flex;
  flex-direction: column;
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(30px);
  position: relative;
  overflow: hidden;
  will-change: transform;
}

.osg-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.osg-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 40px var(--primary-color-shadow), 0 8px 32px var(--shadow-color);
}

.osg-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.osg-card-icon {
  color: var(--primary-color);
}

.osg-card-tag {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--bg-color-tertiary);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.osg-card-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
  position: relative;
  z-index: 2;
}

.osg-card-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-color-secondary);
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.osg-card-url {
  font-size: 13px;
  color: var(--text-color-tertiary);
  font-family: 'Courier New', monospace;
  position: relative;
  z-index: 2;
}

/* ===== 合作伙伴 ===== */
.partners {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.partners-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.partner-card {
  padding: 40px;
  border-radius: 20px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(30px);
  position: relative;
  overflow: hidden;
  will-change: transform;
}

.partner-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.partner-card:hover {
  border-color: var(--border-color-secondary);
  box-shadow: 0 0 40px var(--primary-color-shadow), 0 8px 32px var(--shadow-color);
}

.partner-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin: 0 auto 20px;
  font-weight: 700;
  font-size: 24px;
  border: 1px solid var(--border-color-secondary);
  position: relative;
  z-index: 2;
}

.partner-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
  position: relative;
  z-index: 2;
}

.partner-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-color-secondary);
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}

.partner-tag {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg-color-tertiary);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-tertiary);
  position: relative;
  z-index: 2;
}

/* ===== CTA ===== */
.cta {
  padding: 120px 24px;
  text-align: center;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.cta-orb {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: var(--primary-color);
  filter: blur(150px);
  opacity: 0.05;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: cta-pulse 6s ease-in-out infinite;
}

@keyframes cta-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.05; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.08; }
}

.cta-title {
  position: relative;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.cta-desc {
  position: relative;
  font-size: 17px;
  color: var(--text-color-secondary);
  margin-bottom: 36px;
}

.cta-actions {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* ===== 页脚 ===== */
.footer {
  padding: 40px 24px;
  border-top: 1px solid var(--border-color-primary);
  position: relative;
  z-index: 2;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo {
  height: 24px;
  width: auto;
  object-fit: contain;
}

.footer-brand {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.footer-links {
  display: flex;
  gap: 28px;
}

.footer-links a {
  font-size: 14px;
  color: var(--text-color-tertiary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: var(--primary-color);
}

.footer-copy {
  font-size: 13px;
  color: var(--text-color-quaternary);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .hero {
    padding: 140px 20px 80px;
    min-height: auto;
  }

  .hero-logo-img {
    height: 72px;
  }

  .hero-title {
    font-size: 44px;
  }

  .hero-desc {
    font-size: 16px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .hide-mobile {
    display: none;
  }

  .projects-grid,
  .osg-grid {
    grid-template-columns: 1fr;
  }

  .partners-grid {
    grid-template-columns: 1fr;
  }

  .section-title,
  .cta-title {
    font-size: 30px;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }

  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }
}
</style>