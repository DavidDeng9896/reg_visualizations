import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FeedbackCancelError,
  dismissNewestToastElement,
  isFeedbackCancel,
  isFeedbackDialogOpen,
  listFocusable,
  preferCancelInitialFocus,
  toastLivePoliteness,
  trapTabKey,
} from '@/shared/ui/feedbackA11y'
import {
  confirm,
  onFeedbackDialogOpenChange,
  prompt,
  toast,
  listToastCloseButtons,
} from '@/shared/ui/feedback'

describe('feedbackA11y', () => {
  it('maps toast live politeness by severity', () => {
    expect(toastLivePoliteness('info')).toBe('polite')
    expect(toastLivePoliteness('success')).toBe('polite')
    expect(toastLivePoliteness('warning')).toBe('assertive')
    expect(toastLivePoliteness('error')).toBe('assertive')
  })

  it('prefers Cancel initial focus for destructive confirms', () => {
    expect(preferCancelInitialFocus()).toBe(true)
    expect(preferCancelInitialFocus({ type: 'warning' })).toBe(true)
    expect(preferCancelInitialFocus({ type: 'error' })).toBe(true)
    expect(preferCancelInitialFocus({ danger: true, type: 'info' })).toBe(true)
    expect(preferCancelInitialFocus({ type: 'info' })).toBe(false)
    expect(preferCancelInitialFocus({ type: 'success' })).toBe(false)
  })

  it('lists focusable controls and traps Tab', () => {
    const root = document.createElement('div')
    const a = document.createElement('button')
    a.textContent = 'A'
    const b = document.createElement('button')
    b.textContent = 'B'
    root.append(a, b)
    document.body.appendChild(root)
    expect(listFocusable(root)).toEqual([a, b])

    a.focus()
    const shift = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    const shiftPrevent = vi.spyOn(shift, 'preventDefault')
    expect(trapTabKey(root, shift)).toBe(true)
    expect(shiftPrevent).toHaveBeenCalled()
    expect(document.activeElement).toBe(b)

    b.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    const forwardPrevent = vi.spyOn(forward, 'preventDefault')
    expect(trapTabKey(root, forward)).toBe(true)
    expect(forwardPrevent).toHaveBeenCalled()
    expect(document.activeElement).toBe(a)

    root.remove()
  })

  it('detects cancel errors', () => {
    expect(isFeedbackCancel(new FeedbackCancelError())).toBe(true)
    expect(isFeedbackCancel({ action: 'cancel' })).toBe(true)
    expect(isFeedbackCancel(new Error('nope'))).toBe(false)
  })

  it('dismisses newest toast element and detects open dialogs', () => {
    const host = document.createElement('div')
    const a = document.createElement('div')
    a.textContent = 'a'
    const b = document.createElement('div')
    b.textContent = 'b'
    host.append(a, b)
    expect(dismissNewestToastElement(host)).toBe(true)
    expect([...host.children].map((c) => c.textContent)).toEqual(['b'])
    expect(dismissNewestToastElement(host)).toBe(true)
    expect(host.children.length).toBe(0)
    expect(dismissNewestToastElement(host)).toBe(false)
    expect(dismissNewestToastElement(null)).toBe(false)

    expect(isFeedbackDialogOpen()).toBe(false)
    const dlg = document.createElement('div')
    dlg.setAttribute('data-ia-feedback', 'confirm')
    document.body.appendChild(dlg)
    expect(isFeedbackDialogOpen()).toBe(true)
    dlg.remove()
  })
})

describe('native feedback', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-toast-host],[data-ia-feedback]').forEach((el) => el.remove())
    document.body.style.overflow = ''
  })

  it('renders toast with aria-live', () => {
    toast('success', '已保存')
    const el = document.querySelector('.ia-toast--success')
    expect(el?.textContent).toContain('已保存')
    expect(el?.getAttribute('aria-live')).toBe('polite')
    expect(el?.getAttribute('role')).toBe('status')

    toast('error', '失败')
    const err = document.querySelector('.ia-toast--error')
    expect(err?.getAttribute('aria-live')).toBe('assertive')
    expect(err?.getAttribute('role')).toBe('alert')
  })

  it('exposes a keyboard-reachable close button that dismisses the toast', () => {
    toast('info', '可关闭')
    const el = document.querySelector('.ia-toast--info')!
    const close = el.querySelector<HTMLButtonElement>('button.ia-toast__close')
    expect(close).toBeTruthy()
    expect(close!.getAttribute('aria-label')).toBe('关闭通知')
    expect(close!.type).toBe('button')
    close!.focus()
    expect(document.activeElement).toBe(close)
    close!.click()
    expect(document.querySelector('.ia-toast--info')).toBeNull()
  })

  it('dismisses toast on Escape when focus is inside the toast', () => {
    toast('warning', '按 Esc 关闭')
    const el = document.querySelector('.ia-toast--warning')!
    const close = el.querySelector<HTMLButtonElement>('button.ia-toast__close')!
    close.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast--warning')).toBeNull()
  })

  it('orders toast close buttons newest-first for Tab', () => {
    toast('info', 'first')
    toast('success', 'second')
    toast('warning', 'third')
    const closes = listToastCloseButtons()
    expect(closes).toHaveLength(3)
    const texts = closes.map((btn) => btn.parentElement?.querySelector('.ia-toast__text')?.textContent)
    expect(texts).toEqual(['third', 'second', 'first'])
  })

  it('document Escape dismisses the newest toast when no dialog is open', () => {
    toast('info', 'old')
    toast('success', 'new')
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    const texts = [...document.querySelectorAll('.ia-toast__text')].map((n) => n.textContent)
    expect(texts).toEqual(['old'])
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast')).toBeNull()
  })

  it('marks toast host inert while confirm is open so focus cannot reach toast close', async () => {
    toast('info', 'behind dialog')
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

    const p = confirm('挡住 toast', '确认', { type: 'info' })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    expect(host.hasAttribute('inert')).toBe(true)

    // Document Esc must not dismiss the toast while a dialog owns the layer
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.querySelector('.ia-toast--info')).toBeTruthy()
    expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy()

    const root = document.querySelector('[data-ia-feedback="confirm"]')!
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(p).rejects.toMatchObject({ action: 'cancel' })
    expect(document.querySelector('.ia-toast--info')).toBeTruthy()
    expect(host.hasAttribute('inert')).toBe(false)
  })

  it('notifies subscribers when confirm opens and closes (Round 32)', async () => {
    const seen: boolean[] = []
    const stop = onFeedbackDialogOpenChange((open) => {
      seen.push(open)
    })
    expect(seen[0]).toBe(false)

    const p = confirm('订阅确认', '确认', { type: 'info' })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    expect(seen).toContain(true)

    const root = document.querySelector('[data-ia-feedback="confirm"]')!
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(p).rejects.toMatchObject({ action: 'cancel' })
    expect(seen.at(-1)).toBe(false)
    stop()
  })

  it('danger confirm focuses Cancel and styles primary as danger', async () => {
    const p = confirm('确定删除？此操作不可撤销。', '删除', {
      danger: true,
      confirmButtonText: '删除',
    })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    const panel = document.querySelector('.ia-feedback-panel')!
    expect(panel.getAttribute('data-ia-danger')).toBe('1')
    const cancel = [...panel.querySelectorAll('button')].find((b) => b.textContent === '取消')!
    const dangerBtn = panel.querySelector('[data-ia-confirm-danger]')!
    expect(dangerBtn.textContent).toBe('删除')
    expect(dangerBtn.className).toContain('btn-danger')
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel))

    cancel.click()
    await expect(p).rejects.toMatchObject({ action: 'cancel' })
  })

  it('confirm resolves on OK and rejects on Esc', async () => {
    const okPromise = confirm('确定继续？', '确认', { type: 'info', confirmButtonText: '确定' })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    const panel = document.querySelector('.ia-feedback-panel')!
    const primary = [...panel.querySelectorAll('button')].find((b) => b.textContent === '确定')!
    await vi.waitFor(() => expect(document.activeElement).toBe(primary))
    primary.click()
    await expect(okPromise).resolves.toBe(true)

    const cancelPromise = confirm('再删？', '确认')
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    const root = document.querySelector('[data-ia-feedback="confirm"]')!
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(cancelPromise).rejects.toMatchObject({ action: 'cancel' })
  })

  it('prompt returns input value and cancels via backdrop / Cancel', async () => {
    const p = prompt('新名称', '重命名', { inputValue: 'old' })
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="prompt"]')).toBeTruthy())
    const input = document.querySelector<HTMLInputElement>('.ia-feedback-input')!
    expect(input.value).toBe('old')
    await vi.waitFor(() => expect(document.activeElement).toBe(input))
    input.value = 'new-name'
    const primary = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '确定',
    ) as HTMLButtonElement
    primary.click()
    await expect(p).resolves.toEqual({ value: 'new-name' })

    const cancelViaBtn = prompt('名称', '重命名')
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="prompt"]')).toBeTruthy())
    const cancel = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement
    cancel.click()
    await expect(cancelViaBtn).rejects.toMatchObject({ action: 'cancel' })

    const cancelViaBackdrop = prompt('名称', '重命名')
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="prompt"]')).toBeTruthy())
    document.querySelector<HTMLButtonElement>('.ia-feedback-backdrop')!.click()
    await expect(cancelViaBackdrop).rejects.toMatchObject({ action: 'cancel' })
  })
})
