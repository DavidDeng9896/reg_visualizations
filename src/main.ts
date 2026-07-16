import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import VxeUI from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'
import App from './App.vue'
import { router } from './app/router'
import './styles/main.css'

const app = createApp(App)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Insight Analysis]', info, err)
  const el = document.getElementById('app')
  if (el && !el.dataset.errorShown) {
    el.dataset.errorShown = '1'
    el.innerHTML = `<div style="padding:24px;font-family:sans-serif;color:#c45656">
      <h2>应用加载出错</h2>
      <pre style="white-space:pre-wrap">${String(err)}</pre>
      <p>详情见浏览器控制台。</p>
    </div>`
  }
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(VxeUI)
app.use(VxeUITable)
app.mount('#app')
