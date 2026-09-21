import assert from 'node:assert'

export type Minimums = {
  large_text_min: number
  non_text_min: number
  text_min: number
}

export type Tokens = {
  duration_ms: Record<string, number>
  pairs: Pair[]
  space: Record<string, number>
  target: { comfortable: number; minimum: number }
  themes: Record<string, Record<string, string>>
}

type Pair = {
  background: string
  foreground: string
  kind: string
  theme: string
}

const HEX = /^#[0-9a-f]{6}$/iu
const CHANNEL_MAX = 255
const SRGB_KNEE = 0.040_45
const RED_WEIGHT = 0.212_6
const GREEN_WEIGHT = 0.715_2
const BLUE_WEIGHT = 0.072_2
const CONTRAST_OFFSET = 0.05
const RATIO_DECIMALS = 2

const isHexColor = (value: string): boolean => {
  assert(typeof value === 'string')

  const matched = HEX.test(value)

  assert(typeof matched === 'boolean')

  return matched
}

const channelLuminance = (value: number): number => {
  assert(value >= 0)
  assert(value <= CHANNEL_MAX)

  const ratio = value / CHANNEL_MAX
  const linear =
    ratio <= SRGB_KNEE ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4

  assert(linear >= 0)
  assert(linear <= 1)

  return linear
}

const relativeLuminance = (hex: string): number => {
  assert(isHexColor(hex))

  const red = channelLuminance(Number.parseInt(hex.slice(1, 3), 16))
  const green = channelLuminance(Number.parseInt(hex.slice(3, 5), 16))
  const blue = channelLuminance(Number.parseInt(hex.slice(5, 7), 16))
  const luminance = RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue

  assert(luminance >= 0)
  assert(luminance <= 1)

  return luminance
}

export const contrastRatio = (first: string, second: string): number => {
  assert(isHexColor(first))
  assert(isHexColor(second))

  const one = relativeLuminance(first)
  const two = relativeLuminance(second)
  const lighter = Math.max(one, two)
  const darker = Math.min(one, two)
  const ratio = (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET)

  assert(ratio >= 1)
  assert(ratio <= 21)

  return ratio
}

export const minimumFor = (kind: string, minimums: Minimums): number => {
  assert(kind.length > 0)
  assert(minimums.text_min > 0)

  if (kind === 'text') {
    return minimums.text_min
  }

  if (kind === 'large_text') {
    return minimums.large_text_min
  }

  if (kind === 'non_text') {
    return minimums.non_text_min
  }

  return 0
}

const colorOf = (tokens: Tokens, theme: string, name: string): string => {
  assert(theme.length > 0)
  assert(name.length > 0)

  const palette = tokens.themes[theme] ?? {}
  const color = palette[name] ?? ''

  assert(typeof color === 'string')

  return color
}

export const pairProblems = (tokens: Tokens, minimums: Minimums): string[] => {
  assert(Array.isArray(tokens.pairs))
  assert(minimums.text_min > 0)

  const problems: string[] = []

  for (const [index, pair] of tokens.pairs.entries()) {
    const foreground = colorOf(tokens, pair.theme, pair.foreground)
    const background = colorOf(tokens, pair.theme, pair.background)
    const named = `${pair.theme} ${pair.foreground} on ${pair.background}`

    if (!isHexColor(foreground) || !isHexColor(background)) {
      problems.push(
        `pair ${index + 1}, ${named}, names a token that the themes do not hold.`,
      )
      continue
    }

    const minimum = minimumFor(pair.kind, minimums)

    if (minimum === 0) {
      problems.push(
        `pair ${index + 1}, ${named}, has the kind ${pair.kind}, which is not a kind of the policy.`,
      )
      continue
    }

    const ratio = contrastRatio(foreground, background)

    if (ratio < minimum) {
      problems.push(
        `pair ${index + 1}, ${named}, is ${ratio.toFixed(RATIO_DECIMALS)} to 1, and the minimum is ${minimum} to 1. Rule COLOR-02.`,
      )
    }
  }

  return problems
}

export const targetProblems = (
  tokens: Tokens,
  minimumCssPx: number,
): string[] => {
  assert(minimumCssPx > 0)
  assert(typeof tokens.target === 'object')

  const problems: string[] = []

  if (tokens.target.minimum < minimumCssPx) {
    problems.push(
      `the token target.minimum is ${tokens.target.minimum} and target.min_css_px is ${minimumCssPx}. Rule SIZE-01.`,
    )
  }

  assert(problems.length <= 1)

  return problems
}
