import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * Default application preset — Vercel / shadcn-inspired clean design.
 *
 * DESIGN PRINCIPLE: The surface scale IS the design system.
 *
 * Aura derives border, text, and background tokens from specific surface
 * shades.  Each shade below is designed to match its Aura semantic role with
 * the corresponding Tailwind Neutral color (the same palette used by
 * turborepo.dev / Vercel's design system), so everything propagates
 * automatically — no component-level or explicit content/text overrides
 * needed.
 *
 * Aura derivation map (verified against @primeuix/themes source):
 *
 *   Aura token            Light ← shade   Dark ← shade
 *   ─────────────────────────────────────────────────────
 *   content.background     {surface.0}     {surface.900}
 *   content.borderColor    {surface.200}   {surface.700}
 *   text.color             {surface.700}   {surface.0}
 *   text.hoverColor        {surface.800}   {surface.0}
 *   text.mutedColor        {surface.500}   {surface.400}
 *   text.hoverMutedColor   {surface.600}   {surface.300}
 *   formField.background   {surface.0}     {surface.950}
 *   hover backgrounds      {surface.50}    {surface.800}
 *   active / selected bg   {surface.100}   {surface.700/800}
 *
 * To customise: change the hex values in light/dark surface blocks.  Every
 * PrimeVue component (Card, Dialog, DataTable, Menu…) will follow.
 */

const preset = definePreset(Aura, {
  components: {
    card: {
      root: {
        shadow: 'none',
      },
    },
  },
  primitive: {
    borderRadius: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.625rem',
    },
  },
  semantic: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
        /**
         * Light surface scale — Tailwind Neutral palette.
         *
         *   shade  Aura role                 Tailwind / Vercel token
         *   ─────  ────────────────────────  ────────────────────────
         *   0      page bg · card bg         white (#ffffff)
         *   50     hover bg · zebra rows     neutral-50 (#fafafa)
         *   100    active bg · selected bg   neutral-100 (#f5f5f5)
         *   200    borders (cards, panels)   neutral-200 (#e5e5e5)
         *   300    heavier borders           neutral-300 (#d4d4d4)
         *   400    placeholder · disabled    neutral-400 (#a3a3a3)
         *   500    muted text                neutral-500 (#737373)
         *   600    muted text on hover       neutral-600 (#525252)
         *   700    body text                 neutral-950 (#0a0a0a)
         *   800    body text on hover        neutral-950 (#0a0a0a)
         *   900    emphatic / headings       neutral-950 (#0a0a0a)
         *   950    inverse backgrounds       neutral-950 (#0a0a0a)
         */
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#0a0a0a',
          800: '#0a0a0a',
          900: '#0a0a0a',
          950: '#0a0a0a',
        },
      },
      dark: {
        primary: {
          color: '{primary.400}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.400} 16%, transparent)',
          focusBackground: 'color-mix(in srgb, {primary.400} 24%, transparent)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
        /**
         * Dark surface scale — Turbo / Vercel dark tokens.
         *
         *   shade  Aura role                 Vercel / shadcn token
         *   ─────  ────────────────────────  ────────────────────────
         *   0      text · inverse bg         --foreground (#fafafa)
         *   50     (light reference)         —
         *   100    (rarely used dark)        —
         *   200    (rarely used dark)        —
         *   300    muted text on hover       —
         *   400    muted text · placeholder  --muted-foreground (#a1a1a1)
         *   500    secondary text            neutral-500 (#737373)
         *   600    input borders             neutral-700 (#404040)
         *   700    borders (cards, panels)   --border solid equiv (#292929)
         *   800    hover bg · selected bg    --muted (#262626)
         *   900    card bg                   --card (#171717)
         *   950    page bg · input bg        --background (#0a0a0a)
         */
        surface: {
          0: '#fafafa',
          50: '#f5f5f5',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#b3b3b3',
          400: '#a1a1a1',
          500: '#737373',
          600: '#404040',
          700: '#292929',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
    },
  },
})

export default preset
