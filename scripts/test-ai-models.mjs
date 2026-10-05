#!/usr/bin/env node
// Tests every AI model of the deployed app and prints what works.
//
//   node scripts/test-ai-models.mjs [url] [--provider=groq,mistral] [--list]
//
// Calls GET /api/diagnose (one short request per model). Set AI_ACCESS_CODE in
// the environment when the Worker requires one.

const args = process.argv.slice(2)
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'https://fr.testcivique.workers.dev').replace(/\/$/, '')
const provider = args.find((arg) => arg.startsWith('--provider='))?.split('=')[1]
const list = args.includes('--list')

const url = new URL(`${base}/api/diagnose`)
if (provider) url.searchParams.set('provider', provider)
if (list) url.searchParams.set('list', '1')

const response = await fetch(url, {
  headers: process.env.AI_ACCESS_CODE ? { 'x-access-code': process.env.AI_ACCESS_CODE } : {},
})
const data = await response.json()
if (!response.ok) {
  console.error(`HTTP ${response.status}:`, data.error ?? data)
  process.exit(1)
}

for (const report of data.reports) {
  const mark = report.ok ? 'OK  ' : 'FAIL'
  const detail = report.ok ? JSON.stringify(report.sample ?? '') : report.error
  console.log(
    `${mark} ${report.provider.padEnd(11)} ${report.kind.padEnd(5)} ${report.model.padEnd(48)} ${String(report.ms).padStart(6)} ms  ${detail}`,
  )
}
console.log('\nProviders:')
for (const entry of data.summary) {
  console.log(`  ${entry.ok ? 'OK  ' : 'FAIL'} ${entry.provider.padEnd(11)} ${entry.firstWorking ?? '-'}`)
}
if (data.notConfigured?.length) console.log(`\nNot configured: ${data.notConfigured.join(', ')}`)
if (data.available) {
  for (const [id, models] of Object.entries(data.available)) {
    console.log(`\n${id} models:`, Array.isArray(models) ? models.join(', ') : models)
  }
}
