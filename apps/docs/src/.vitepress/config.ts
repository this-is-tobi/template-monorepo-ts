import { defineConfig } from 'vitepress'
import sidebar from './sidebar.json' assert { type: 'json'}

export default defineConfig({
  base: '/',
  lang: 'en-US',
  title: 'Home',
  description: 'Typescript monorepo template documentation',
  srcDir: './pages',
  cleanUrls: false,
  themeConfig: {
    outline: [2, 3],
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/this-is-tobi' }
    ]
  },
})
