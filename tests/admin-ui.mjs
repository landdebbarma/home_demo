// Browser-level acceptance test: drives the real admin UI in headless Chrome against the Vite dev
// server, with an in-memory GitHub mock behind the API. Run: npm run test:ui
// Set CHROME_PATH if Chrome isn't at the default Windows location.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { hashPassword } from '../server/auth.js'
import { startMockGitHub } from './mock-github.mjs'

const PORT = 5199
const BASE = `http://localhost:${PORT}`
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ADMIN = { email: 'admin@example.test', password: 'ui-test-password-123' }
const gh = await startMockGitHub()
const IMGS = mkdtempSync(join(tmpdir(), 'tca-ui-img-'))
const files = {}
for (const [name, color] of [['cover', '#b9a58c'], ['g1', '#6b5646'], ['g2', '#dccfbc'], ['g3', '#2a2420'], ['hero', '#8c9a72']]) {
  files[name] = join(IMGS, `${name}.jpg`)
  await sharp({ create: { width: 3200, height: 2100, channels: 3, background: color } }).jpeg().toFile(files[name])
}

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  env: {
    ...process.env,
    GITHUB_API_URL: gh.api, GITHUB_REPO: 'owner/site', GITHUB_BRANCH: 'main', GITHUB_TOKEN: 'static-test-token',
    ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD_HASH: await hashPassword(ADMIN.password), SESSION_SECRET: 's'.repeat(48),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
await new Promise((resolve, reject) => {
  vite.stdout.on('data', (d) => String(d).includes('Local') && resolve())
  vite.on('exit', (c) => reject(new Error(`vite exited ${c}`)))
})

const repo = () => JSON.parse(gh.file('content/projects.json').toString()).projects
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
// Stand in for the deployed site's build marker: "deployed" = whatever the mock branch head is.
await page.setRequestInterception(true)
page.on('request', (r) => (new URL(r.url()).pathname === '/version.json'
  ? r.respond({ contentType: 'application/json', body: JSON.stringify({ commit: gh.head() }) })
  : r.continue()))

const step = async (name, fn) => { await fn(); console.log(`  ✓ ${name}`) }
const clickText = async (text, scope = 'button, a') => {
  const ok = await page.evaluate((text, scope) => {
    const el = [...document.querySelectorAll(scope)].find((e) => e.textContent.trim() === text && !e.disabled && e.offsetParent !== null)
    el?.click()
    return !!el
  }, text, scope)
  assert.ok(ok, `no clickable "${text}"`)
}
const waitText = (text, timeout = 30000) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text)
const field = (label) => page.evaluateHandle((label) => [...document.querySelectorAll('label')].find((l) => l.querySelector('span')?.textContent === label)?.querySelector('input, textarea'), label)
const typeInto = async (label, value, replace = false) => {
  const h = (await field(label)).asElement()
  if (replace) await h.evaluate((e) => e.select())
  await h.type(value)
}
/** Wait until the repository (the source of truth) reaches the expected state. */
const until = async (cond, what, timeout = 30000) => {
  for (const end = Date.now() + timeout; Date.now() < end; await new Promise((r) => setTimeout(r, 200))) if (cond()) return
  throw new Error(`timed out waiting for: ${what}`)
}
const galleryAlts = () => page.$$eval('input[aria-label^="Alt text for image"]', (els) => els.map((e) => e.value))
const confirmDialog = async (action) => {
  await page.waitForSelector('dialog[open]')
  await clickText(action, 'dialog[open] button')
}

let id
try {
  await step('1. logs in', async () => {
    await page.goto(`${BASE}/admin`)
    await page.waitForSelector('input[name=email]')
    await page.type('input[name=email]', ADMIN.email)
    await page.type('input[name=password]', ADMIN.password)
    await clickText('Sign in')
    await waitText('Recently edited')
  })

  await step('2. starts a new project from "Add New Project"', async () => {
    await clickText('Add New Project')
    await waitText('Project details')
    await typeInto('Title', 'Courtyard House')
    await typeInto('Category', 'Residential Architecture')
    await typeInto('Location', 'Bengaluru')
    await typeInto('Year', '2025')
    await typeInto('Short description', 'A home arranged around a planted courtyard.')
  })

  await step('3. uploads a cover (resized in the browser, optimised on the server)', async () => {
    const input = await page.$('section:has(h2) input[type=file]:not([multiple])')
    await input.uploadFile(files.cover)
    await page.waitForSelector('img[alt="Current cover"]')
  })

  await step('4. uploads several gallery images at once', async () => {
    await (await page.$('input[type=file][multiple]')).uploadFile(files.g1, files.g2, files.g3)
    await waitText('3 images added')
    assert.equal((await galleryAlts()).length, 3)
  })

  await step('5. reorders with drag-and-drop and arrow buttons', async () => {
    const alts = await page.$$('input[aria-label^="Alt text for image"]')
    for (const [i, v] of ['first', 'second', 'third'].entries()) await alts[i].type(v)
    await page.evaluate(() => {
      const items = document.querySelectorAll('li[draggable=true]')
      const dt = new DataTransfer()
      items[2].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
      items[0].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      items[0].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
    })
    assert.deepEqual(await galleryAlts(), ['third', 'first', 'second'])
    await page.click('button[aria-label="Move image 2 down"]')
    assert.deepEqual(await galleryAlts(), ['third', 'second', 'first'])
    await page.type('input[aria-label="Caption for image 1"]', 'The courtyard')
  })

  await step('previews the unsaved draft with the public project layout', async () => {
    await clickText('Preview')
    await page.waitForSelector('dialog[open] section[aria-label="Project gallery"] img')
    const ok = await page.$$eval('dialog[open] img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth > 0).length)
    assert.ok(ok >= 4, `preview images loaded: ${ok}`)
    assert.ok((await page.$eval('dialog[open]', (d) => d.innerText)).includes('The courtyard'))
    await clickText('Close preview')
  })

  await step('6. "Save draft" makes one commit with the JSON and every image', async () => {
    const before = gh.head()
    await clickText('Save draft')
    await page.waitForFunction(() => /\/admin\/projects\/[a-f0-9]{12}$/.test(location.pathname))
    id = page.url().split('/').pop()
    const p = repo().find((x) => x.id === id)
    assert.equal(p.status, 'draft')
    assert.deepEqual(p.gallery.map((g) => g.alt), ['third', 'second', 'first'])
    assert.deepEqual(gh.commit(gh.head()).parents, [before])
    for (const img of [p.cover, ...p.gallery]) assert.ok(gh.files().some((f) => f.includes(img.id)), 'image not committed')
    assert.equal(p.cover.w, 2400, 'browser downsized 3200px to 2400px')
  })

  await step('7. publishing shows deploy progress until the site reports the commit', async () => {
    await clickText('Publish')
    await waitText('Saved — publishing to the website')
    await waitText('Live on the website', 40000)
    assert.equal(repo().find((x) => x.id === id).status, 'published')
  })

  await step('a concurrent edit is caught; work is kept and saved after reloading', async () => {
    gh.pushDirect({ 'content/projects.json': JSON.stringify({ projects: repo().map((p) => (p.id === id ? { ...p, year: '2030' } : p)) }) })
    await typeInto('Location', 'Bengaluru, Karnataka', true)
    await clickText('Save changes')
    await waitText('Someone else changed this content')
    assert.equal(await (await field('Location')).evaluate((e) => e.value), 'Bengaluru, Karnataka', 'edits kept')
    await clickText('Load latest version')
    await waitText('kept your changes')
    await clickText('Save changes')
    await until(() => repo().find((x) => x.id === id).location === 'Bengaluru, Karnataka', 'location saved')
    assert.equal(repo().find((x) => x.id === id).year, '2030', 'the other edit must not be overwritten')
  })

  await step('earlier saves are marked live once a later deploy that contains them is live', async () => {
    await page.waitForFunction(() => {
      const panel = document.querySelector('[aria-label="Publishing status"]')
      return panel && !panel.innerText.includes('deploying')
    }, { timeout: 40000 })
  })

  await step('unsaved changes survive a page reload and can be restored', async () => {
    await typeInto('Title', 'Courtyard House, Revisited', true)
    await new Promise((r) => setTimeout(r, 300))
    page.once('dialog', (d) => d.accept()) // "leave site?" prompt from the unsaved-changes guard
    await page.reload()
    await waitText('You have unsaved changes from')
    await clickText('Restore them')
    assert.equal(await (await field('Title')).evaluate((e) => e.value), 'Courtyard House, Revisited')
    await clickText('Save changes')
    await until(() => repo().find((x) => x.id === id).title === 'Courtyard House, Revisited', 'title saved')
  })

  await step('11. deleting a gallery image removes its files on save', async () => {
    const victim = repo().find((x) => x.id === id).gallery[0] // the first Delete button
    await clickText('Delete', 'li[draggable=true] button')
    await confirmDialog('Remove image')
    await page.waitForFunction(() => !document.querySelector('dialog[open]'))
    await clickText('Save changes')
    await until(() => repo().find((x) => x.id === id).gallery.length === 2, 'image removed')
    assert.ok(!gh.files().some((f) => f.includes(victim.id)))
  })

  await step('Website Content: replace the hero, edit the phone; a concurrent edit elsewhere is merged, not lost', async () => {
    await clickText('Website Content')
    await page.waitForSelector('input[aria-label="Phone"]')
    const external = JSON.parse(gh.file('content/site-content.json').toString())
    gh.pushDirect({ 'content/site-content.json': JSON.stringify({ ...external, contact: { ...external.contact, instagram: 'changed.elsewhere' } }) })
    await page.$eval('input[aria-label="Phone"]', (e) => e.select())
    await page.type('input[aria-label="Phone"]', '+91 11111 22222')
    await clickText('Homepage', '[role=tab]')
    const input = await page.evaluateHandle(() => document.querySelector('button[aria-label="Replace Hero image"]').closest('.grid').querySelector('input[type=file]'))
    await input.asElement().uploadFile(files.hero)
    await page.waitForFunction(() => !document.body.innerText.includes('Uploading'))
    await clickText('Save')
    await waitText('Someone else changed this content')
    await clickText('Load latest version')
    await waitText('kept your changes')
    await clickText('Save')
    await until(() => JSON.parse(gh.file('content/site-content.json').toString()).contact.phone === '+91 11111 22222', 'site content saved')
    assert.equal(JSON.parse(gh.file('content/site-content.json').toString()).contact.instagram, 'changed.elsewhere', 'external edit preserved')
    const site = JSON.parse(gh.file('content/site-content.json').toString())
    assert.equal(site.contact.phone, '+91 11111 22222')
    assert.ok(gh.files().some((f) => f.includes(site.home.heroImage.id)))
  })

  await step('12–13. deletes the project after confirming; entry and files are removed', async () => {
    const p = repo().find((x) => x.id === id)
    await page.goto(`${BASE}/admin/projects/${id}`)
    await waitText('Danger zone')
    await clickText('Delete project')
    await confirmDialog('Delete project')
    await page.waitForFunction(() => location.pathname === '/admin/projects')
    assert.ok(!repo().some((x) => x.id === id))
    for (const img of [p.cover, ...p.gallery]) assert.ok(!gh.files().some((f) => f.includes(img.id)))
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
  vite.kill()
  await gh.close()
  rmSync(IMGS, { recursive: true, force: true })
}
