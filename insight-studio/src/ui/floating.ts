import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type FloatingPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'right-start' | 'top' | 'bottom'

export interface FloatingStyle {
  position: 'fixed'
  top: string
  left: string
  minWidth?: string
  maxWidth?: string
  transform?: string
  zIndex: string | number
}

const GAP = 8

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Anchor rect → fixed panel style; keeps panel inside the viewport. */
export function computeFloatingStyle(
  anchor: DOMRect,
  panel: { width: number; height: number },
  placement: FloatingPlacement,
  opts: { minWidth?: number; zIndex?: string | number; matchAnchorWidth?: boolean } = {},
): FloatingStyle {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const zIndex = opts.zIndex ?? 'var(--is-z-popover)'
  let top = 0
  let left = 0
  let transform: string | undefined

  const width = opts.matchAnchorWidth ? Math.max(opts.minWidth ?? 0, anchor.width) : panel.width || opts.minWidth || 160
  const height = panel.height || 40

  switch (placement) {
    case 'bottom-start':
      top = anchor.bottom + GAP
      left = anchor.left
      break
    case 'bottom-end':
      top = anchor.bottom + GAP
      left = anchor.right - width
      break
    case 'top-start':
      top = anchor.top - GAP - height
      left = anchor.left
      break
    case 'right-start':
      top = anchor.top
      left = anchor.right + GAP
      break
    case 'top':
      top = anchor.top - GAP - height
      left = anchor.left + anchor.width / 2
      transform = 'translateX(-50%)'
      break
    case 'bottom':
      top = anchor.bottom + GAP
      left = anchor.left + anchor.width / 2
      transform = 'translateX(-50%)'
      break
  }

  // Flip vertically if overflowing viewport
  if ((placement === 'bottom-start' || placement === 'bottom-end' || placement === 'bottom') && top + height > vh - 8) {
    top = Math.max(8, anchor.top - GAP - height)
  }
  if ((placement === 'top-start' || placement === 'top') && top < 8) {
    top = Math.min(vh - height - 8, anchor.bottom + GAP)
  }

  if (!transform) {
    left = clamp(left, 8, Math.max(8, vw - width - 8))
  } else {
    // centered: keep bubble roughly on-screen
    const half = width / 2
    left = clamp(left, 8 + half, Math.max(8 + half, vw - half - 8))
  }
  top = clamp(top, 8, Math.max(8, vh - height - 8))

  const style: FloatingStyle = {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    zIndex,
  }
  if (transform) style.transform = transform
  if (opts.matchAnchorWidth) style.minWidth = `${Math.round(Math.max(anchor.width, opts.minWidth ?? 0))}px`
  else if (opts.minWidth) style.minWidth = `${opts.minWidth}px`
  return style
}

/** Keep a teleported floating panel aligned to an anchor while open. */
export function useFloatingPanel(
  open: Ref<boolean> | (() => boolean),
  anchorEl: Ref<HTMLElement | undefined>,
  panelEl: Ref<HTMLElement | undefined>,
  placement: Ref<FloatingPlacement> | (() => FloatingPlacement),
  opts: {
    matchAnchorWidth?: boolean
    minWidth?: number
    zIndex?: string | number
  } = {},
) {
  const style = ref<FloatingStyle>({
    position: 'fixed',
    top: '0px',
    left: '0px',
    zIndex: opts.zIndex ?? 'var(--is-z-popover)',
  })

  const isOpen = () => (typeof open === 'function' ? open() : open.value)
  const getPlacement = () => (typeof placement === 'function' ? placement() : placement.value)

  function update() {
    if (!isOpen()) return
    const anchor = anchorEl.value?.getBoundingClientRect()
    if (!anchor) return
    const panel = panelEl.value?.getBoundingClientRect()
    style.value = computeFloatingStyle(
      anchor,
      { width: panel?.width ?? 0, height: panel?.height ?? 0 },
      getPlacement(),
      {
        matchAnchorWidth: opts.matchAnchorWidth,
        minWidth: opts.minWidth,
        zIndex: opts.zIndex,
      },
    )
  }

  let raf = 0
  function schedule() {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      update()
      // second pass after panel paints its real size
      nextTick(update)
    })
  }

  function onScrollOrResize() {
    if (isOpen()) schedule()
  }

  onMounted(() => {
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    // capture scroll from any scrollable ancestor
    document.addEventListener('scroll', onScrollOrResize, true)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onScrollOrResize)
    document.removeEventListener('scroll', onScrollOrResize, true)
  })

  watch(
    () => isOpen(),
    (v) => {
      if (v) schedule()
    },
    { immediate: true },
  )

  return { style, update: schedule }
}
