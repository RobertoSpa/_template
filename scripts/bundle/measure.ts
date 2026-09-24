import { type Count, type FileGroup } from './shared.ts'
import assert from 'node:assert'
import { brotliCompressSync, constants } from 'node:zlib'

export type Manifest = Record<string, ManifestChunk>
export type Package = { instance: string; name: string }
type ManifestChunk = {
  assets?: string[]
  css?: string[]
  dynamicImports?: string[]
  file: string
  imports?: string[]
  isDynamicEntry?: boolean
  isEntry?: boolean
  src?: string
}

const HASH = /-[\w-]{8}(\.[a-z\d]+)$/iu
const STORE = '/node_modules/.pnpm/'
const MODULES = '/node_modules/'
const VIRTUAL = '\0'
const MANIFEST_MAX = 10_000
const PAGES = 'src/pages/'
const ASSETS = 'assets/'
const HTML = 'index.html'

// Vite hashes only the files of assets/, so site-manifest.json keeps its name.
export const hashlessName = (name: string): string => {
  assert(name.length > 0)

  const hashless = name.startsWith(ASSETS) ? name.replace(HASH, '$1') : name

  assert(hashless.length > 0)
  assert(hashless.length <= name.length)

  return hashless
}

export const countOf = (
  bytes: Uint8Array,
  compress: boolean,
  quality: number,
): Count => {
  assert(quality >= 0)
  assert(quality <= 11)

  if (!compress) {
    return { raw: bytes.length, wire: bytes.length }
  }

  const compressed = brotliCompressSync(bytes, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: quality,
      [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
    },
  })

  assert(compressed.length > 0)

  return { raw: bytes.length, wire: compressed.length }
}

export const groupsOf = (
  name: string,
  files: Record<string, FileGroup>,
): string[] => {
  assert(name.length > 0)
  assert(Object.keys(files).length > 0)

  const groups = Object.entries(files)
    .filter(
      ([, group]) =>
        group.extensions.some((extension) => name.endsWith(extension)) ||
        (group.allowed_other ?? []).includes(name),
    )
    .map(([group]) => group)

  assert(groups.length <= Object.keys(files).length)

  return groups
}

const filesOfChunk = (chunk: ManifestChunk): string[] => {
  assert(chunk.file.length > 0)

  const files = [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]

  assert(files.length > 0)

  return files
}

const nextKeysOf = (chunk: ManifestChunk, withDynamic: boolean): string[] => {
  assert(chunk.file.length > 0)

  const keys = withDynamic
    ? [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]
    : (chunk.imports ?? [])

  assert(Array.isArray(keys))

  return keys
}

// blocked names each key that the walk does not enter, such as a different page.
const treeOf = (
  manifest: Manifest,
  keys: string[],
  withDynamic: boolean,
  blocked: (key: string) => boolean = () => false,
): string[] => {
  assert(keys.length > 0)
  assert(Object.keys(manifest).length <= MANIFEST_MAX)

  const seen = new Set<string>()
  const files = new Set<string>()
  const queue = [...keys]

  for (let step = 0; step < MANIFEST_MAX && queue.length > 0; step += 1) {
    const key = queue.pop() ?? ''
    const chunk = manifest[key]

    assert(chunk !== undefined, `${key} is not a key of the manifest`)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)

    for (const file of filesOfChunk(chunk)) {
      files.add(file)
    }

    queue.push(
      ...nextKeysOf(chunk, withDynamic).filter((next) => !blocked(next)),
    )
  }

  assert(queue.length === 0, 'the manifest tree is larger than MANIFEST_MAX')

  return [...files].toSorted()
}

export const staticFilesOf = (manifest: Manifest, keys: string[]): string[] =>
  treeOf(manifest, keys, false)

export const loadedFilesOf = (manifest: Manifest, keys: string[]): string[] =>
  treeOf(manifest, keys, true)

export const pageKeysOf = (manifest: Manifest, page: string): string[] => {
  assert(page.length > 0)
  assert(!page.includes('/'))

  const folder = `${PAGES}${page}/`
  const outside = Object.entries(manifest).filter(
    ([key]) => !key.startsWith(folder),
  )
  const loaded = new Set(
    outside.flatMap(([, chunk]) => chunk.dynamicImports ?? []),
  )
  const keys = Object.keys(manifest)
    .filter((key) => key.startsWith(folder))
    .filter((key) => loaded.has(key))
    .toSorted()

  assert(keys.length <= Object.keys(manifest).length)

  return keys
}

export type RouteFiles = {
  loaded: string[]
  names: string[]
  problems: string[]
}

// loaded adds each lazy chunk of the route to names, and no chunk of a different page.
export const routeFilesOf = (
  manifest: Manifest,
  page: string | undefined,
): RouteFiles => {
  assert(manifest[HTML] !== undefined, 'the manifest has no index.html')
  assert(page === undefined || page.length > 0)

  const shell = staticFilesOf(manifest, [HTML])

  if (page === undefined) {
    const loaded = treeOf(manifest, [HTML], true, (key) =>
      key.startsWith(PAGES),
    )

    return { loaded: [HTML, ...loaded], names: [HTML, ...shell], problems: [] }
  }

  const keys = pageKeysOf(manifest, page)

  if (keys.length !== 1) {
    return {
      loaded: [],
      names: [],
      problems: [
        `src/pages/${page} has ${keys.length} dynamic entries that the router loads, and it must have 1. Rule SPLIT-01.`,
      ],
    }
  }

  const folder = `${PAGES}${page}/`
  const otherPage = (key: string) =>
    key.startsWith(PAGES) && !key.startsWith(folder)

  return {
    loaded: [HTML, ...treeOf(manifest, [HTML, keys[0]], true, otherPage)],
    names: [HTML, ...staticFilesOf(manifest, [HTML, keys[0]])],
    problems: [],
  }
}

const nameAfterModules = (id: string): string => {
  assert(id.includes(MODULES))

  const rest = id.slice(id.lastIndexOf(MODULES) + MODULES.length)
  const parts = rest.split('/')

  assert(parts.length > 0)

  return rest.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

export const packageOf = (id: string): Package | undefined => {
  assert(id.length > 0)

  if (id.startsWith(VIRTUAL)) {
    return undefined
  }

  if (!id.includes(MODULES)) {
    return undefined
  }

  const store = id.indexOf(STORE)
  const name = nameAfterModules(id)
  const instance =
    store === -1 ? name : id.slice(store + STORE.length).split('/')[0] || name

  assert(name.length > 0)
  assert(instance.length > 0)

  return { instance, name }
}
