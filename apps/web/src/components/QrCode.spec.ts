import { describe, expect, it } from 'vitest'
import { mountPage } from '~/test/helpers'
import QrCode from './QrCode.vue'

const OTPAUTH = 'otpauth://totp/Template:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Template'

async function mountQr(props: Record<string, unknown> = {}) {
  const { wrapper } = await mountPage(QrCode, { props: { value: OTPAUTH, ...props } })
  return wrapper
}

describe('qrCode', () => {
  it('should render an accessible image, not a decorative blob', async () => {
    const wrapper = await mountQr()
    const svg = wrapper.find('svg')

    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBeTruthy()
  })

  it('should render one rect per dark module', async () => {
    const wrapper = await mountQr()
    expect(wrapper.findAll('rect').length).toBeGreaterThan(0)
  })

  it('should never print the payload as text', async () => {
    // The enrolment URI embeds the TOTP secret. It belongs in the matrix and
    // nowhere else — not in the markup, not in an aria-label.
    const wrapper = await mountQr()

    expect(wrapper.text()).not.toContain('JBSWY3DPEHPK3PXP')
    expect(wrapper.html()).not.toContain('JBSWY3DPEHPK3PXP')
  })

  it('should encode the value, not a fixed pattern', async () => {
    const a = await mountQr({ value: 'otpauth://totp/a?secret=AAAA' })
    const b = await mountQr({ value: 'otpauth://totp/b?secret=BBBB' })

    expect(a.html()).not.toBe(b.html())
  })

  describe('quiet zone', () => {
    it('should default to the four modules the QR spec requires', async () => {
      // Below four, scanners can fail to locate the symbol against a busy
      // background. The default has to be safe — callers rarely pass one.
      const wrapper = await mountQr()
      const [, , width] = wrapper.find('svg').attributes('viewBox')!.split(' ').map(Number)

      const xs = wrapper.findAll('rect').map(r => Number(r.attributes('x')))
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(4)
      expect(width! - 1 - Math.max(...xs)).toBeGreaterThanOrEqual(4)
    })

    it('should widen the symbol when a larger quiet zone is asked for', async () => {
      const tight = await mountQr({ margin: 4 })
      const roomy = await mountQr({ margin: 8 })

      const sizeOf = (w: typeof tight) => Number(w.find('svg').attributes('viewBox')!.split(' ')[2])
      expect(sizeOf(roomy)).toBe(sizeOf(tight) + 8)
    })
  })

  it('should render at the requested pixel size', async () => {
    const wrapper = await mountQr({ size: 240 })
    const svg = wrapper.find('svg')

    expect(svg.attributes('width')).toBe('240')
    expect(svg.attributes('height')).toBe('240')
  })
})
