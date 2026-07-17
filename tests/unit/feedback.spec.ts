import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FeedbackCancelError,
  isFeedbackCancel,
  listFocusable,
  preferCancelInitialFocus,
  toastLivePoliteness,
  trapTabKey,
} from '@/shared/ui/feedbackA11y'
import { confirm, prompt, toast } from '@/shared/ui/feedback'

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
