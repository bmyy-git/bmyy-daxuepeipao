import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { store } from './store'
import './styles.css'

async function bootstrap() {
  try {
    await store.init()
  } catch (error) {
    console.error('API initialization failed', error)
  }
  createApp(App).use(router).mount('#app')
}

void bootstrap()
