import { describe, expect, it } from 'vitest'
import { daysFromNow, mountPage } from '~/test/helpers'
import RelativeTime from './RelativeTime.vue'

async function mountAt(value: unknown, props: Record<string, unknown> = {}) {
  const { wrapper } = await mountPage(RelativeTime, { props: { value, ...props } })
  return wrapper
}

describe('relativeTime', () => {
  it('should render the relative form as the visible text', async () => {
    const wrapper = await mountAt(daysFromNow(-3))
    expect(wrapper.text()).toBe('3 days ago')
  })

  it('should render future dates too', async () => {
    const wrapper = await mountAt(daysFromNow(2))
    expect(wrapper.text()).toBe('in 2 days')
  })

  it('should keep the exact timestamp reachable, not only the rounded text', async () => {
    // The whole point of the component: scannable by default, precise on hover
    // and to a screen reader parsing `<time datetime>`.
    const value = '2026-01-02T03:04:05.000Z'
    const wrapper = await mountAt(value)

    expect(wrapper.attributes('datetime')).toBe(new Date(value).toISOString())
    expect(wrapper.attributes('title')).toBeTruthy()
    expect(wrapper.attributes('title')).not.toBe(wrapper.text())
  })

  it('should accept the shapes an API response actually returns', async () => {
    const iso = '2026-01-02T03:04:05.000Z'
    const asString = await mountAt(iso)
    const asDate = await mountAt(new Date(iso))
    const asEpoch = await mountAt(new Date(iso).getTime())

    expect(asDate.attributes('datetime')).toBe(asString.attributes('datetime'))
    expect(asEpoch.attributes('datetime')).toBe(asString.attributes('datetime'))
  })

  describe('missing or unparseable values', () => {
    it.each([[null], [undefined], ['not-a-date']])('should fall back to the placeholder for %p', async (value) => {
      const wrapper = await mountAt(value)
      expect(wrapper.text()).toBe('—')
    })

    it('should omit datetime rather than emit an invalid one', async () => {
      // An unparseable `datetime` is worse than none: it is invalid HTML and
      // assistive tech announces garbage.
      const wrapper = await mountAt('not-a-date')
      expect(wrapper.attributes('datetime')).toBeUndefined()
    })

    it('should honour a custom placeholder', async () => {
      const wrapper = await mountAt(null, { placeholder: 'Never' })
      expect(wrapper.text()).toBe('Never')
    })
  })
})
