import { createApp } from 'vue'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import { boot } from './store'

boot()
createApp(App).mount('#app')
