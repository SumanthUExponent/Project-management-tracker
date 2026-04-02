// Service Account JWT auth — uses Web Crypto API (no extra libraries)
const SA_EMAIL = 'sumanth-udupi@zeta-pivot-488310-r1.iam.gserviceaccount.com'
const SA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCl+s5Nh/PSIPK0
2PH7cNF75mCakEeScDxPNf23Gsd0t5xnIrR0ckk4lTl21ceDjFIAlyoSF+a4wTqp
07/fKsBWpAh6JqTqKbEibfGcel1zkYuviyZ1nSL3qIJH+OMT+7VFn4DjGs/kqQCD
dDJ2dq7Ph3jlz1ZGPAXu/hVStYJ0FKLiYZsT1T44TRLjYA7cd+00e8LMxUW4wHoQ
gS3Y5XN9qDqi/q8SwDJD3BfJHqaowtgN7To9hGwcdTpzfJOj59blGngeIENBB72j
+k++SFkhjhftcd+URVU7nz6cylPLDYaxBodQKDEuJkUGX+lmmy7JxS+UU0P6Wj1L
7tMA1F25AgMBAAECggEAHojP2CqJG+CM1eFNTwT3vNPqdLTTPejg52+Wz88g32OB
5eVYDk4SE1M8gZSdgiFX2pz0k+SKwPVnTePTGgKa5LWDi7k9QIjP+fYA61kFhSPC
71XpityQGMCKyyPJ3pzBQeAwjVca5MWEfypquCloSmxxPNHSXNRhAREEKjWTHLh9
T6h5JwJW/9wTruegUCuxwOiqXGctn1rqGU94cxeh0esRM5NdP5tk5uG6hLCIHlKo
ejX7sIHEgf5s0/bYrNazkE0rRDMSR6hILHkWNdrN+mK2pUCiPUaNR2q+hbhdmBxe
sXzOLbZONeGll4JVbj6Oz6f2Raw2B2I6eIcogu20qQKBgQDQSR6jbyt3X6h0746q
Ya7pMDddliS8ML1pGgepCB8eH0AJ6ShjyYD9YiCFS/VoPhFpacJp7WmOAGLXj62F
PMFrLnmuT+KvYaghyukLdVqy143wVeH3E6v8GfXn7+QcVGTTDhy9kbc8m8bn/sLv
9IBPWZObKI9UEhxlC37wJ/n17QKBgQDMAKl5tWJ23df1VrSrdNmvfAZo0lSbL6YI
hIutrYPX01H9AlDV5eoKFH+3rk3+Aip/mVFdcM4j+6vPzFIuDtUhg2s8gBrvkxdg
YORHrD8+B3uoZ6oUGKqJEQOXnk3BJCAs5HtcRmNeHmuQAfowrApaIXRe7mdrSs/e
oHvBNitNfQKBgHwtG7cUcDWbMjOFHuk1k7IyrM9+1CfeZw5iFm8QCH1M5EEEYLAd
Umm+NuVBg+3CE19lTiMZB/VBBay+XBUzQ51C+AiUV/F3p2V+M7JBJPG60USX7z/+
2mpSj+jXfIfnSLULlNbwKO5ZcRyfJlkoy9aC8R1v8QOOSJ91WxiSvNOBAoGBALwX
DCscUwm3pyscY34GQcMrvhkdfEaNGy+VTde3OO1geKKnZPKihjP/DHbFrkE5rAdz
y/I0VMwWeiYgg9DVeirpKZFhp/QmEZKaIz/2D2VYrunpkoXu7CVuW3qKybP/Y+8g
RqEggPPBZnkjaZNAvFa3q7zvYMkq9BeWriPJlwldAoGAJhUa7gztbXIkJPNbyigy
pP4GnaWr2IimQ9pi4F6gHiIEt6/bvQHeeb+RfqYf0iait/2pdKU1w4O82MkClBVU
2tFCHYfMaRUwXXDSJr3sY4EmNXWefZR5KJ4NAPT2yt2UJOln36x0z2giQ0w7ug1j
o8lq/rorZP6Q3WYP1wVG2JQ=
-----END PRIVATE KEY-----`

let _cachedToken = null
let _tokenExpiry = 0

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(b64)
  const buf = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buf
}

function b64url(data) {
  let str
  if (typeof data === 'string') {
    str = btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    ))
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(data)))
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000)
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    iss: SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const signingInput = `${header}.${payload}`
  const keyData = pemToArrayBuffer(SA_PRIVATE_KEY)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  )

  const jwt = `${signingInput}.${b64url(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) throw new Error(`Service account token error: ${res.status}`)
  const data = await res.json()
  _cachedToken = data.access_token
  _tokenExpiry = now + (data.expires_in || 3600)
  return _cachedToken
}
