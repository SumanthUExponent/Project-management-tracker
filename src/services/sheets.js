import { SHEET_ID } from '../config.js'
import { getServiceAccountToken } from './serviceAccount.js'

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

async function readToken(userToken) {
  return userToken || await getServiceAccountToken()
}

// ─── Read ────────────────────────────────────────────────────────────────────
export async function readSheet(sheetName, userToken = null) {
  const token = await readToken(userToken)
  const range = encodeURIComponent(`${sheetName}!A1:Z2000`)
  const url = `${BASE}/${SHEET_ID}/values/${range}?access_token=${token}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets read error: ${res.status}`)
  const data = await res.json()
  return rowsToObjects(data.values || [])
}

export async function readSheetRaw(sheetName, userToken = null) {
  const token = await readToken(userToken)
  const range = encodeURIComponent(`${sheetName}!A1:Z2000`)
  const url = `${BASE}/${SHEET_ID}/values/${range}?access_token=${token}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets read error: ${res.status}`)
  const data = await res.json()
  return data.values || []
}

// ─── Write single cell / range ────────────────────────────────────────────────
export async function writeCell(sheetName, row, col, value, token) {
  const colLetter = colToLetter(col)
  const range = encodeURIComponent(`${sheetName}!${colLetter}${row}`)
  const url = `${BASE}/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED&access_token=${token}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[value]] }),
  })
  if (!res.ok) throw new Error(`Sheets write error: ${res.status}`)
  return res.json()
}

// ─── Batch update multiple ranges ─────────────────────────────────────────────
export async function batchWrite(updates, token) {
  // updates: [{ range: 'Sheet!A1', values: [[val]] }, ...]
  const url = `${BASE}/${SHEET_ID}/values:batchUpdate?access_token=${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates }),
  })
  if (!res.ok) throw new Error(`Sheets batch write error: ${res.status}`)
  return res.json()
}

// ─── Append row ──────────────────────────────────────────────────────────────
export async function appendRow(sheetName, rowValues, token) {
  const range = encodeURIComponent(`${sheetName}!A1`)
  const url = `${BASE}/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&access_token=${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowValues] }),
  })
  if (!res.ok) throw new Error(`Sheets append error: ${res.status}`)
  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rowsToObjects(rows) {
  if (!rows.length) return []
  const headers = rows[0].map(h => h?.toString().trim())
  return rows.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
}

function colToLetter(col) {
  let result = ''
  let n = col
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}
