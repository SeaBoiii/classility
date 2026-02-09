import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

interface ResultsList {
  results: Array<{ id: string }>
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'out')

function parseArg(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return null
  }
  return process.argv[index + 1] ?? null
}

async function getResultIds(): Promise<string[]> {
  const raw = await readFile(path.resolve(rootDir, 'data/results.json'), 'utf-8')
  const parsed = JSON.parse(raw) as ResultsList
  return parsed.results.map((item) => item.id)
}

async function run() {
  const specificId = parseArg('--id')
  const exportAll = process.argv.includes('--all')

  if (!specificId && !exportAll) {
    throw new Error('Usage: npm run export -- --id class_spellblade OR npm run export:all')
  }

  const knownIds = await getResultIds()
  const targetIds = exportAll ? knownIds : [specificId as string]

  targetIds.forEach((id) => {
    if (!knownIds.includes(id)) {
      throw new Error(`Unknown result id "${id}"`)
    }
  })

  await mkdir(outDir, { recursive: true })

  const viteServer = await createServer({
    configFile: path.resolve(rootDir, 'vite.config.ts'),
    root: rootDir,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 4173,
    },
  })
  await viteServer.listen()
  const addressInfo = viteServer.httpServer?.address()
  if (!addressInfo || typeof addressInfo === 'string') {
    throw new Error('Unable to determine local Vite server address for export.')
  }
  const baseUrl = `http://127.0.0.1:${addressInfo.port}`

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 900, height: 1400 },
    deviceScaleFactor: 1,
  })

  try {
    for (const id of targetIds) {
      const page = await context.newPage()
      await page.goto(`${baseUrl}/#/card/${id}?export=1`, {
        waitUntil: 'networkidle',
      })
      await page.waitForSelector('[data-card-export="true"]')
      await page.evaluate(async () => {
        if ('fonts' in document) {
          await document.fonts.ready
        }
      })

      const card = page.locator('[data-card-export="true"]')
      const box = await card.boundingBox()
      if (!box) {
        throw new Error(`Card not rendered for id "${id}"`)
      }

      if (Math.round(box.width) !== 900 || Math.round(box.height) !== 1400) {
        throw new Error(`Card has wrong size for "${id}": ${Math.round(box.width)}x${Math.round(box.height)}`)
      }

      const outputPath = path.resolve(outDir, `${id}.png`)
      await page.screenshot({
        path: outputPath,
        omitBackground: true,
      })
      await page.close()
      console.log(`Exported ${outputPath}`)
    }
  } finally {
    await context.close()
    await browser.close()
    await viteServer.close()
  }
}

run().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
