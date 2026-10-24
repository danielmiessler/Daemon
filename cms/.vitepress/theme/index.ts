import type { Theme } from 'vitepress'
import './style.css'
import DaemonDashboard from './components/DaemonDashboard.vue'

// Optional commercial fonts: a glob matches nothing (and imports nothing) when fonts.css
// is absent, so the build works either way. See fonts.example.css.
import.meta.glob('./fonts.css', { eager: true })

export default {
  Layout: DaemonDashboard,
  enhanceApp({ app }) {
    app.component('DaemonDashboard', DaemonDashboard)
  }
} satisfies Theme
