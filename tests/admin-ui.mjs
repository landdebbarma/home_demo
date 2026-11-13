// Browser-level acceptance test: drives the real admin UI (buttons, file inputs,
// drag-and-drop, confirm dialogs) against an isolated server, then checks the public site.
// Requires `npm run build` and a local Chrome/Edge. Run: npm run test:ui
// Set CHROME_PATH if Chrome is not at the default Windows location.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import puppeteer from 'puppeteer-core'

const PORT = 4398
const BASE = `http://localhost:${PORT}`
const DATA = mkdtempSync(join(tmpdir(), 'tca-ui-'))
const IMGS = mkdtempSync(join(tmpdir(), 'tca-ui-img-'))
const ADMIN = { email: 'admin@example.test', password: 'ui-test-password-123' }
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
if (!existsSync('dist/index.html')) throw new Error('Run `npm run build` first.')

let server
function start() {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password, SITE_URL: BASE },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => String(d).includes('[server]') && resolve())
    server.on('exit', (c) => reject(new Error(`server exited (${c})`)))
  })
}
const stop = () => new Promise((r) => { server.removeAllListeners('exit'); server.on('exit', r); server.kill() })

const files = {}
for (const [name, color] of [['cover', '#b9a58c'], ['g1', '#6b5646'], ['g2', '#dccfbc'], ['g3', '#2a2420']]) {
  files[name] = join(IMGS, `${name}.jpg`)
  await sharp({ create: { width: 1600, height: 1100, channels: 3, background: color } }).jpeg().toFile(files[name])
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
await page.evaluateOnNewDocument(() => sessionStorage.setItem('tca-intro', '1'))

const step = async (name, fn) => { await fn(); console.log(`  ✓ ${name}`) }
const clickText = async (text, scope = 'button, a') => {
  const ok = await page.evaluate((text, scope) => {
    const el = [...document.querySelectorAll(scope)].find((e) => e.textContent.trim() === text && !e.disabled && e.offsetParent !== null)
    el?.click()
    return !!el
  }, text, scope)
  assert.ok(ok, `no clickable "${text}"`)
}
const waitText = (text) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 30000 }, text)
const galleryAlts = () => page.$$eval('input[aria-label^="Alt text for image"]', (els) => els.map((e) => e.value))
const confirmDialog = async (action) => {
  await page.waitForSelector('dialog[open]')
  await clickText(action, 'dialog[open] button')
}

try {
  await start()

  await step('1. logs in through the login form', async () => {
    await page.goto(`${BASE}/admin`)
    await page.waitForSelector('input[name=email]')
    await page.type('input[name=email]', ADMIN.email)
    await page.type('input[name=password]', ADMIN.password)
    await clickText('Sign in')
    await waitText('Recently edited')
  })

  await step('2. creates a project via "Add New Project"', async () => {
    await clickText('Add New Project')
    await page.waitForSelector('input[name=title]')
    await page.type('input[name=title]', 'Courtyard House')
    await clickText('Create draft')
    await waitText('Project details')
    assert.match(page.url(), /\/admin\/projects\/\d+$/)
  })

  await step('3. uploads a cover image through the file input', async () => {
    const input = await page.$('section:has(h2) input[type=file]:not([multiple])')
    await input.uploadFile(files.cover)
    await waitText('Cover image updated.')
    await page.waitForSelector('img[alt="Current cover"]')
  })

  await step('4. uploads several gallery images at once', async () => {
    const input = await page.$('input[type=file][multiple]')
    await input.uploadFile(files.g1, files.g2, files.g3)
    await waitText('3 images added.')
    assert.equal((await galleryAlts()).length, 3)
  })

  await step('5. reorders with drag-and-drop and with the arrow buttons', async () => {
    const alts = await page.$$('input[aria-label^="Alt text for image"]')
    for (const [i, v] of ['first', 'second', 'third'].entries()) await alts[i].type(v)
    // HTML5 drag-and-drop: drag item 3 onto item 1.
    await page.evaluate(() => {
      const items = document.querySelectorAll('li[draggable=true]')
      const dt = new DataTransfer()
      items[2].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
      items[0].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      items[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
      items[2].dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
    })
    assert.deepEqual(await galleryAlts(), ['third', 'first', 'second'])
    await page.click('button[aria-label="Move image 2 down"]')
    assert.deepEqual(await galleryAlts(), ['third', 'second', 'first'])
  })

  await step('6. fills in project details and a caption', async () => {
    const field = async (label, value) => {
      const h = await page.evaluateHandle((label) => [...document.querySelectorAll('label')].find((l) => l.querySelector('span')?.textContent === label)?.querySelector('input, textarea'), label)
      await h.asElement().type(value)
    }
    await field('Category', 'Residential Architecture')
    await field('Location', 'Bengaluru')
    await field('Year', '2025')
    await field('Short description', 'A home arranged around a planted courtyard.')
    await page.type('input[aria-label="Caption for image 1"]', 'The courtyard')
  })

  await step('7. publishes with the Publish button', async () => {
    await clickText('Publish')
    await waitText('Published — the project is now live on the website.')
    await waitText('View on website ↗')
  })

  await step('8–9. project is on the public Projects page; detail shows the gallery in order', async () => {
    const pub = await browser.newPage()
    await pub.goto(`${BASE}/projects`, { waitUntil: 'networkidle0' })
    assert.ok((await pub.content()).includes('Courtyard House'))
    await pub.goto(`${BASE}/projects/courtyard-house`, { waitUntil: 'networkidle0' })
    await pub.waitForFunction(() => document.querySelectorAll('section[aria-label="Project gallery"] img').length === 3)
    const alts = await pub.$$eval('section[aria-label="Project gallery"] img', (els) => els.map((e) => e.alt))
    assert.deepEqual(alts, ['third', 'second', 'first'])
    assert.ok((await pub.content()).includes('The courtyard'))
    await pub.close()
  })

  await step('10. edits a published project and saves; change is public', async () => {
    const title = await page.evaluateHandle(() => [...document.querySelectorAll('label')].find((l) => l.querySelector('span')?.textContent === 'Title').querySelector('input'))
    await title.asElement().evaluate((e) => e.select())
    await title.asElement().type('Courtyard House, Revisited')
    await clickText('Save changes')
    await waitText('Changes saved.')
    const r = await (await fetch(`${BASE}/api/projects/courtyard-house`)).json()
    assert.equal(r.project.title, 'Courtyard House, Revisited')
  })

  await step('11. deletes a gallery image after confirming', async () => {
    await clickText('Delete', 'li[draggable=true] button')
    await confirmDialog('Delete image')
    await waitText('Image deleted.')
    assert.equal((await galleryAlts()).length, 2)
    const r = await (await fetch(`${BASE}/api/projects/courtyard-house`)).json()
    assert.equal(r.project.images.length, 2)
  })

  await step('cancelling the delete-project dialog keeps the project', async () => {
    await clickText('Delete project')
    await page.waitForSelector('dialog[open]')
    await clickText('Cancel', 'dialog[open] button')
    assert.equal((await fetch(`${BASE}/api/projects/courtyard-house`)).status, 200)
  })

  await step('12–13. deletes the project after confirming; it disappears publicly', async () => {
    await clickText('Delete project')
    await confirmDialog('Delete project')
    await page.waitForFunction(() => location.pathname === '/admin/projects')
    assert.equal((await fetch(`${BASE}/api/projects/courtyard-house`)).status, 404)
  })

  await step('14. state persists across a server restart', async () => {
    await stop()
    await start()
    await page.goto(`${BASE}/admin/projects`)
    await waitText('Sample Project 01')
    assert.ok(!(await page.content()).includes('Courtyard House'))
  })

  await step('Website Content: edits the phone number and it shows in the footer', async () => {
    await page.goto(`${BASE}/admin/content`)
    await page.waitForSelector('input[aria-label="Phone"]')
    await page.$eval('input[aria-label="Phone"]', (e) => e.select())
    await page.type('input[aria-label="Phone"]', '+91 11111 22222')
    await clickText('Save section')
    await waitText('Contact details saved')
    const pub = await browser.newPage()
    await pub.goto(`${BASE}/`, { waitUntil: 'networkidle0' })
    assert.ok((await pub.$eval('footer', (f) => f.innerText)).includes('+91 11111 22222'))
    await pub.close()
  })

  await step('Logout returns to the sign-in form', async () => {
    await clickText('Logout')
    await page.waitForSelector('input[name=password]')
  })

  assert.deepEqual(pageErrors, [], 'uncaught page errors')
  console.log('\nAdmin UI workflow passed.')
} catch (e) {
  console.error('\n✗ FAILED:', e.message)
  await page.screenshot({ path: join(tmpdir(), 'tca-ui-failure.png') }).catch(() => {})
  console.error('Screenshot:', join(tmpdir(), 'tca-ui-failure.png'))
  process.exitCode = 1
} finally {
  await browser.close()
  await stop().catch(() => {})
  rmSync(DATA, { recursive: true, force: true })
  rmSync(IMGS, { recursive: true, force: true })
}
