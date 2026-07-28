import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/tokens.css'
import './assets/themes.css'
import './assets/base.css'
import './assets/main.css'

import { setupWebMock } from './web-mock'
setupWebMock()

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import i18n, { elementPlusLocale } from './i18n'
import { useAppStore } from './stores/useAppStore'
import { usePerCardAISettingsStore } from './stores/usePerCardAISettingsStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(ElementPlus, { locale: elementPlusLocale })

// 初始化主题（必须在挂载前）
const appStore = useAppStore()
appStore.initTheme()

// --- Load initial data ---
const perCardStore = usePerCardAISettingsStore()
perCardStore.loadFromLocal()

app.mount('#app')
