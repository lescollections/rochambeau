/**
 * Monochrome screen of a picture, computed in the browser.
 *
 * The picture is laid on a mid-grey canvas — either as a grid of dots whose
 * radius follows the local contrast, or as a plain grey wash. The canvas is
 * then composited over the banner with `hard-light` at a low opacity, which
 * pivots on that mid-grey: it stays neutral, black darkens the gradient by the
 * full opacity (the intended rgba(0, 0, 0, .2) shadow) and light dots lift it
 * by a little over half as much, so faces come out of the blue instead of only
 * shadowing it. Nothing is precomputed — one pass per picture and per resize.
 */

/** Level a cell has to reach to lift the banner rather than shadow it. */
const PIVOT = 0.625
/** Lightest ink laid down: at .2 opacity, +12% of light on the banner. */
const LIGHTEST = 0.8
/** Ink never quite covers a cell: even the flattest area keeps its grain. */
const HEAVIEST = 0.92

export interface HalftoneOptions {
  /** Distance between two dot centres, in CSS pixels. */
  step?: number
  /** Screen angle in degrees. 45° is the classic monochrome screen. */
  angle?: number
  /** false lays the picture down as a continuous wash, without a screen. */
  dotted?: boolean
}

/**
 * Loads a picture the canvas is allowed to read back. Servers that answer
 * without CORS headers reject here, which is the signal to drop the effect.
 */
export function loadScreenableImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`halftone: ${src} cannot be read back`))
    image.src = src
  })
}

/**
 * Screens `image` onto `canvas`.
 * Returns false when the pixels stay out of reach, so the caller can hide it.
 */
export function drawHalftone(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  width: number,
  height: number,
  options: HalftoneOptions = {},
): boolean {
  const step = options.step ?? 4
  const angle = ((options.angle ?? 45) * Math.PI) / 180
  const dotted = options.dotted ?? true

  if (width < 1 || height < 1 || image.naturalWidth < 1) return false

  const context = canvas.getContext('2d')
  if (!context) return false

  // Retina sharpens the dots; beyond 2× the extra pixels buy nothing here.
  const density = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * density)
  canvas.height = Math.round(height * density)
  context.setTransform(density, 0, 0, density, 0, 0)

  // Mid-grey is the neutral value under `hard-light`: everywhere the screen
  // leaves blank, the banner keeps its own gradient.
  context.fillStyle = 'rgb(128, 128, 128)'
  context.fillRect(0, 0, width, height)

  const grid = sampleCells(image, width, height, dotted ? step : 6)
  if (!grid) return false
  const levels = stretch(grid)

  if (!dotted) {
    // Same levels, but as a continuous wash: `contrast` and `brightness` are
    // the CSS way to spell out the very curve `stretch` computed.
    context.filter = `grayscale(1) brightness(${levels.brightness}) contrast(${levels.contrast})`
    const band = secondQuarter(image, width, height)
    context.drawImage(image, band.x, band.y, band.width, band.height, 0, 0, width, height)
    context.filter = 'none'
    return true
  }

  // One dot per cell, laid on a grid rotated around the centre of the banner.
  const centreX = width / 2
  const centreY = height / 2
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const reach = Math.hypot(width, height) / 2 + step
  // At full ink the dots must touch across the diagonal of their cell,
  // otherwise the deepest areas keep a grid of neutral holes.
  const maxRadius = step * 0.71

  // Two screens on the same grid: one of shadow below the pivot, one of light
  // above it. A cell right on the pivot draws nothing and stays out of the way.
  const shadows = new Path2D()
  const lights = new Path2D()
  for (let v = -reach; v <= reach; v += step) {
    for (let u = -reach; u <= reach; u += step) {
      const x = centreX + u * cosine - v * sine
      const y = centreY + u * sine + v * cosine
      if (x < -step || y < -step || x > width + step || y > height + step) continue

      const column = clamp(Math.floor(x / step), grid.columns - 1)
      const row = clamp(Math.floor(y / step), grid.rows - 1)
      const level = levels.level(grid.cells[row * grid.columns + column] ?? 255)

      const lifting = level > PIVOT
      const ink = lifting ? (level - PIVOT) / (1 - PIVOT) : (PIVOT - level) / PIVOT
      // Radius on the square root of the ink: the *area* of a dot, not its
      // width, is what the eye reads as a grey level.
      const radius = maxRadius * Math.sqrt(HEAVIEST * ink)
      if (radius < 0.2) continue
      const dots = lifting ? lights : shadows
      dots.moveTo(x + radius, y)
      dots.arc(x, y, radius, 0, Math.PI * 2)
    }
  }

  // One fill per screen: neighbouring dots overlap without ever stacking their
  // opacity, so each tone stays perfectly even.
  context.fillStyle = '#000'
  context.fill(shadows)
  context.fillStyle = `rgb(${255 * LIGHTEST}, ${255 * LIGHTEST}, ${255 * LIGHTEST})`
  context.fill(lights)
  return true
}

function clamp(value: number, last: number): number {
  return value < 0 ? 0 : value > last ? last : value
}

/**
 * The slice of the picture the banner shows: its second quarter from the top,
 * where the subject of a framed work usually sits, cropped to the banner ratio.
 */
function secondQuarter(
  image: HTMLImageElement,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const top = image.naturalHeight * 0.25
  const band = image.naturalHeight * 0.25

  // `cover` on that band: keep the widest crop the banner ratio allows.
  let cropWidth = image.naturalWidth
  let cropHeight = band
  if (cropWidth / cropHeight > width / height) cropWidth = cropHeight * (width / height)
  else cropHeight = cropWidth / (width / height)

  return {
    x: (image.naturalWidth - cropWidth) / 2,
    y: top + (band - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  }
}

interface Grid {
  /** One grey level (0–255) per screen cell, row after row. */
  cells: Uint8Array
  columns: number
  rows: number
}

interface Levels {
  /** Stretched level of a grey, from 0 (deepest) to 1 (lightest). */
  level: (grey: number) => number
  /** The same curve, written as the CSS filter pair. */
  brightness: number
  contrast: number
}

/**
 * Builds the grey → ink curve for this picture. Museum photographs are often
 * dark and low in contrast: taken as they are, they screen into a flat black
 * rectangle. Stretching the levels the picture actually uses — 2nd to 98th
 * percentile, so a highlight or a black frame does not set the scale — gives
 * every picture a screen that breathes.
 */
function stretch(grid: Grid): Levels {
  const histogram = new Uint32Array(256)
  for (const grey of grid.cells) histogram[grey]! += 1

  const margin = Math.round(grid.cells.length * 0.02)
  const low = percentile(histogram, margin)
  const high = percentile(histogram, grid.cells.length - 1 - margin)
  const span = high - low

  // A flat picture has nothing to say: `contrast(0)` is the plain mid-grey the
  // screen treats as neutral.
  if (span < 8) return { level: () => PIVOT, brightness: 1, contrast: 0 }

  // The wash is scaled to LIGHTEST, which puts its neutral point on the very
  // PIVOT the dots use. CSS applies brightness then contrast, so
  // out = (in × b − .5) × c + .5 has to match out = LIGHTEST × (in − low) / span.
  const contrast = 1 + (2 * LIGHTEST * low) / span
  return {
    level: (grey) => {
      const level = (grey - low) / span
      return level < 0 ? 0 : level > 1 ? 1 : level
    },
    brightness: (LIGHTEST * 255) / span / contrast,
    contrast,
  }
}

/** Grey level of the `rank`-th darkest cell. */
function percentile(histogram: Uint32Array, rank: number): number {
  let seen = 0
  for (let grey = 0; grey < 256; grey += 1) {
    seen += histogram[grey]!
    if (seen > rank) return grey
  }
  return 255
}

/**
 * Averages the picture down to one pixel per screen cell — the browser's own
 * downscaling does the averaging — and reads it back as grey levels.
 */
function sampleCells(
  image: HTMLImageElement,
  width: number,
  height: number,
  step: number,
): Grid | null {
  const columns = Math.ceil(width / step) + 1
  const rows = Math.ceil(height / step) + 1

  const work = document.createElement('canvas')
  work.width = columns
  work.height = rows
  const context = work.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  // Anything the picture does not cover reads as white, hence as no ink.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, columns, rows)

  const band = secondQuarter(image, width, height)
  context.drawImage(image, band.x, band.y, band.width, band.height, 0, 0, columns, rows)

  let pixels: Uint8ClampedArray
  try {
    pixels = context.getImageData(0, 0, columns, rows).data
  } catch {
    // Tainted canvas: the picture is served from a host that refuses CORS.
    return null
  }

  const cells = new Uint8Array(columns * rows)
  for (let index = 0; index < cells.length; index += 1) {
    const offset = index * 4
    cells[index] =
      0.2126 * (pixels[offset] ?? 255) +
      0.7152 * (pixels[offset + 1] ?? 255) +
      0.0722 * (pixels[offset + 2] ?? 255)
  }
  return { cells, columns, rows }
}
