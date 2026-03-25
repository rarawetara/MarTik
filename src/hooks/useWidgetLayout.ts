import { useState } from 'react'

export type SlotPos = 'tl' | 'tr' | 'bl' | 'br'  // top-left, top-right, bottom-left, bottom-right
export type Side = 'left' | 'right'
export type WidgetId = 'water' | 'focus' | 'care' | 'outfit-info'
export type SidebarLayout = Partial<Record<SlotPos, WidgetId>>

export interface ContainerLayout {
  left: SidebarLayout
  right: SidebarLayout
}

export const SLOT_POSITIONS: SlotPos[] = ['tl', 'tr', 'bl', 'br']
export const ALL_WIDGETS: WidgetId[] = ['water', 'focus', 'care', 'outfit-info']

const DEFAULT: ContainerLayout = {
  left: { tl: 'water', bl: 'focus' },
  right: { tl: 'care', bl: 'outfit-info' },
}

const KEY = 'martik-home-layout-v3'

function loadLayout(): ContainerLayout {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as ContainerLayout
    const left = parsed.left && typeof parsed.left === 'object' ? parsed.left : {}
    const right = parsed.right && typeof parsed.right === 'object' ? parsed.right : {}
    const allWidgets = [...Object.values(left), ...Object.values(right)] as WidgetId[]
    const validSet = new Set(ALL_WIDGETS)
    const allValid = allWidgets.every(w => validSet.has(w))
    const allUnique = new Set(allWidgets).size === allWidgets.length
    if (allValid && allUnique && allWidgets.length === 4) {
      return { left: left as SidebarLayout, right: right as SidebarLayout }
    }
  } catch {}
  return DEFAULT
}

export function useWidgetLayout() {
  const [layout, setLayout] = useState<ContainerLayout>(loadLayout)

  const updateLayout = (newLayout: ContainerLayout) => {
    setLayout(newLayout)
    localStorage.setItem(KEY, JSON.stringify(newLayout))
  }

  return { layout, updateLayout }
}
