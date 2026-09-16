export const TAP_MOVE_PX = 8
export const ECHO_SIZE = 36
export const EDGE_INSET = 22
export const ACTION_GAP = 12
export const BUBBLE_W = 208
export const BUBBLE_H = 96
export const FRAME_FOOTER_H = 56

export type Hotspot = {
  x: number
  y: number
  w: number
  h: number
}

export type Box = {
  x: number
  y: number
  w: number
  h: number
}

export type BubbleSide = 'left' | 'right' | 'top' | 'bottom'

export type InstallStep = {
  id: string
  image: string
  imageWidth: number
  imageHeight: number
  action: string
  story: string[]
  hotspot: Hotspot
  bias: BubbleSide
}

export function pleaseClick(action: string) {
  return `Please click ‘${action}’`
}

export const INSTALL_STEPS: InstallStep[] = [
  {
    id: 'more',
    image: '/install/safari-more.jpg',
    imageWidth: 1206,
    imageHeight: 2436,
    action: 'More',
    story: [
      'My creator is trying this out. Echo is not in a store yet. If people actually use it, they will make a real app.',
      pleaseClick('More'),
    ],
    hotspot: { x: 0.795, y: 0.926, w: 0.125, h: 0.045 },
    bias: 'left',
  },
  {
    id: 'view-more',
    image: '/install/view-more.jpg',
    imageWidth: 1206,
    imageHeight: 863,
    action: 'View More',
    story: [
      'They wanted to see if people like this before they build a real app. For now it just lives on your home screen.',
      pleaseClick('View More'),
    ],
    hotspot: { x: 0.76, y: 0.48, w: 0.20, h: 0.36 },
    bias: 'left',
  },
  {
    id: 'add-to-home',
    image: '/install/add-to-home.jpg',
    imageWidth: 1206,
    imageHeight: 1397,
    action: 'Add to Home Screen',
    story: [
      'If you add me and keep using me, they will make a real app.',
      pleaseClick('Add to Home Screen'),
    ],
    hotspot: { x: 0.07, y: 0.848, w: 0.86, h: 0.075 },
    bias: 'top',
  },
  {
    id: 'add',
    image: '/install/add.jpg',
    imageWidth: 1206,
    imageHeight: 2436,
    action: 'Add',
    story: [
      'Last one. Add me to your home screen and try it out.',
      pleaseClick('Add'),
    ],
    hotspot: { x: 0.792, y: 0.028, w: 0.17, h: 0.062 },
    bias: 'left',
  },
]

export function isTap(travelPx: number) {
  return travelPx < TAP_MOVE_PX
}

export function pointerTravel(x0: number, y0: number, x1: number, y1: number) {
  return Math.hypot(x1 - x0, y1 - y0)
}

export function installStep(index: number) {
  const max = INSTALL_STEPS.length - 1
  const clamped = Math.max(0, Math.min(max, index))
  return INSTALL_STEPS[clamped]
}

export function nextInstallIndex(index: number) {
  if (index >= INSTALL_STEPS.length - 1) return null
  return index + 1
}

export function isLastInstallStep(index: number) {
  return index >= INSTALL_STEPS.length - 1
}

/** Fit an image into a box the way CSS `object-fit: contain` does. */
export function containedImageRect(boxW: number, boxH: number, imageW: number, imageH: number): Box {
  if (boxW <= 0 || boxH <= 0 || imageW <= 0 || imageH <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 }
  }
  const boxRatio = boxW / boxH
  const imageRatio = imageW / imageH
  if (imageRatio > boxRatio) {
    const w = boxW
    const h = boxW / imageRatio
    return { x: 0, y: (boxH - h) / 2, w, h }
  }
  const h = boxH
  const w = boxH * imageRatio
  return { x: (boxW - w) / 2, y: 0, w, h }
}

export function hotspotRect(image: Box, hotspot: Hotspot): Box {
  return {
    x: image.x + hotspot.x * image.w,
    y: image.y + hotspot.y * image.h,
    w: hotspot.w * image.w,
    h: hotspot.h * image.h,
  }
}

export function boxCenter(box: Box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

export function hotspotCornerRadius(box: Box) {
  return box.w > box.h * 1.4 ? Math.min(14, box.h / 2) : Math.min(box.w, box.h) / 2
}

export function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.max(min, Math.min(max, value))
}

function bubbleRect(echoX: number, echoY: number, side: BubbleSide, echoSize: number) {
  const half = echoSize / 2
  const gap = 10
  if (side === 'left') {
    return { x: echoX - half - gap - BUBBLE_W, y: echoY - BUBBLE_H / 2, w: BUBBLE_W, h: BUBBLE_H }
  }
  if (side === 'right') {
    return { x: echoX + half + gap, y: echoY - BUBBLE_H / 2, w: BUBBLE_W, h: BUBBLE_H }
  }
  if (side === 'top') {
    return { x: echoX - BUBBLE_W / 2, y: echoY - half - gap - BUBBLE_H, w: BUBBLE_W, h: BUBBLE_H }
  }
  return { x: echoX - BUBBLE_W / 2, y: echoY + half + gap, w: BUBBLE_W, h: BUBBLE_H }
}

function rectFits(box: Box, stageW: number, stageH: number, pad: number) {
  return box.x >= pad && box.y >= pad && box.x + box.w <= stageW - pad && box.y + box.h <= stageH - pad
}

/** Sit near the control, inset from the frame edge. Does not orbit. */
export function echoRestPosition(
  hotspot: Box,
  stageW: number,
  stageH: number,
  bias: BubbleSide = 'left',
  echoSize = ECHO_SIZE,
): { x: number; y: number; side: BubbleSide } {
  const half = echoSize / 2
  const minX = EDGE_INSET + half
  const maxX = stageW - EDGE_INSET - half
  const minY = EDGE_INSET + half
  const maxY = stageH - EDGE_INSET - half
  const center = boxCenter(hotspot)
  const gap = ACTION_GAP + half
  const sides: BubbleSide[] = [bias, 'left', 'right', 'top', 'bottom']
  const unique = sides.filter((side, index) => sides.indexOf(side) === index)
  const options: Array<{ x: number; y: number; side: BubbleSide; dist: number }> = []

  const consider = (x: number, y: number, away: BubbleSide) => {
    const px = clamp(x, minX, maxX)
    const py = clamp(y, minY, maxY)
    const bubbleOrder: BubbleSide[] =
      away === 'left'
        ? ['left', 'top', 'bottom']
        : away === 'right'
          ? ['right', 'top', 'bottom']
          : away === 'top'
            ? ['top', 'left', 'right']
            : ['bottom', 'left', 'right']
    for (const side of bubbleOrder) {
      const bubble = bubbleRect(px, py, side, echoSize)
      if (!rectFits(bubble, stageW, stageH, 8)) continue
      options.push({ x: px, y: py, side, dist: Math.hypot(px - center.x, py - center.y) })
      return
    }
  }

  for (const side of unique) {
    if (side === 'left') consider(hotspot.x - gap, center.y, 'left')
    if (side === 'right') consider(hotspot.x + hotspot.w + gap, center.y, 'right')
    if (side === 'top') consider(center.x, hotspot.y - gap, 'top')
    if (side === 'bottom') consider(center.x, hotspot.y + hotspot.h + gap, 'bottom')
  }

  if (!options.length) {
    const x = clamp(center.x, minX, maxX)
    const y = clamp(center.y, minY, maxY)
    const fallback: BubbleSide[] = ['top', 'left', 'right', 'bottom']
    const side = fallback.find((item) => rectFits(bubbleRect(x, y, item, echoSize), stageW, stageH, 8)) ?? 'top'
    return { x, y, side }
  }

  options.sort((a, b) => a.dist - b.dist)
  return { x: options[0].x, y: options[0].y, side: options[0].side }
}

export function demoFrameRect(
  viewportW: number,
  viewportH: number,
  imageW = 1206,
  imageH = 2436,
  pinBottom?: number,
) {
  const maxW = Math.min(360, Math.max(268, viewportW - 24))
  const maxH = Math.min(viewportH - 24, 720)
  const footer = FRAME_FOOTER_H
  const maxStageH = Math.max(180, maxH - footer)
  const imgRatio = imageW / Math.max(imageH, 1)
  let width = maxW
  let stageH = width / imgRatio
  if (stageH > maxStageH) {
    stageH = maxStageH
    width = Math.max(240, stageH * imgRatio)
  }
  if (width > maxW) {
    width = maxW
    stageH = width / imgRatio
  }
  let height = stageH + footer
  let x = (viewportW - width) / 2
  let y = Math.max(10, (viewportH - height) / 2)
  if (pinBottom != null) {
    y = pinBottom - height
    if (y < 10) {
      y = 10
      height = Math.max(footer + 180, pinBottom - y)
    }
  }
  return { x, y, w: width, h: height }
}
