export const TAP_MOVE_PX = 8

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

export type InstallStep = {
  id: string
  image: string
  imageWidth: number
  imageHeight: number
  action: string
  story: string[]
  hotspot: Hotspot
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
      'My creator is making this experimental — Echo isn’t in a store yet. If people actually keep me around, they’ll make a real app.',
      pleaseClick('More'),
    ],
    hotspot: { x: 0.78, y: 0.918, w: 0.17, h: 0.055 },
  },
  {
    id: 'view-more',
    image: '/install/view-more.jpg',
    imageWidth: 1206,
    imageHeight: 863,
    action: 'View More',
    story: [
      'They’re shipping a tiny experiment first: a home-screen shortcut, not an App Store listing. Success here is the green light.',
      pleaseClick('View More'),
    ],
    hotspot: { x: 0.70, y: 0.40, w: 0.28, h: 0.50 },
  },
  {
    id: 'add-to-home',
    image: '/install/add-to-home.jpg',
    imageWidth: 1206,
    imageHeight: 1397,
    action: 'Add to Home Screen',
    story: [
      'This is the whole bet — if you add Echo and use it, my creator will turn this experiment into an actual app.',
      pleaseClick('Add to Home Screen'),
    ],
    hotspot: { x: 0.06, y: 0.80, w: 0.88, h: 0.16 },
  },
  {
    id: 'add',
    image: '/install/add.jpg',
    imageWidth: 1206,
    imageHeight: 2436,
    action: 'Add',
    story: [
      'Last tap. Keep me on your home screen and try me — that’s how this experiment earns a real app.',
      pleaseClick('Add'),
    ],
    hotspot: { x: 0.76, y: 0.018, w: 0.22, h: 0.085 },
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

export function orbitRadii(hotspot: Box, echoSize: number, pad = 10) {
  return {
    rx: hotspot.w / 2 + echoSize / 2 + pad,
    ry: hotspot.h / 2 + echoSize / 2 + pad,
  }
}

export function orbitPoint(cx: number, cy: number, rx: number, ry: number, angle: number) {
  return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry }
}

export function hotspotCornerRadius(box: Box) {
  return box.w > box.h * 1.4 ? Math.min(14, box.h / 2) : Math.min(box.w, box.h) / 2
}

export type BubbleSide = 'left' | 'right' | 'top' | 'bottom'

export function bubbleSide(echoX: number, echoY: number, stageW: number, stageH: number): BubbleSide {
  const left = echoX
  const right = stageW - echoX
  const top = echoY
  const bottom = stageH - echoY
  const ranked: Array<[BubbleSide, number]> = [
    ['left', left],
    ['right', right],
    ['top', top],
    ['bottom', bottom],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return ranked[0][0]
}

export function demoFrameRect(viewportW: number, viewportH: number) {
  const width = Math.min(360, Math.max(280, viewportW - 24))
  const height = Math.min(width * 1.58, viewportH - 28, 680)
  return {
    x: (viewportW - width) / 2,
    y: Math.max(10, (viewportH - height) / 2),
    w: width,
    h: height,
  }
}
