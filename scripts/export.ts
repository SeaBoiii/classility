import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, 'out')
const outputPath = path.resolve(outDir, 'card.png')

async function run() {
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

  const address = viteServer.httpServer?.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine Vite server address.')
  }
  const baseUrl = `http://127.0.0.1:${address.port}`

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 900, height: 1400 },
    deviceScaleFactor: 1,
  })

  try {
    const page = await context.newPage()
    await page.goto(`${baseUrl}/card?export=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-card-export="true"]')

    const card = page.locator('[data-card-export="true"]')
    const box = await card.boundingBox()
    if (!box) {
      throw new Error('Card was not rendered.')
    }

    if (Math.round(box.width) !== 900 || Math.round(box.height) !== 1400) {
      throw new Error(`Card must be 900x1400, got ${Math.round(box.width)}x${Math.round(box.height)}.`)
    }

    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: true,
    })

    console.log(`Exported ${outputPath}`)
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
