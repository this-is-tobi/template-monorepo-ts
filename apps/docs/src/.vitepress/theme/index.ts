// https://vitepress.dev/guide/custom-theme
import DefaultTheme from 'vitepress/theme'

// Self-hosted Geist, shared with apps/web — see theme/style.css for the
// matching color token overrides.
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './style.css'

export default DefaultTheme
