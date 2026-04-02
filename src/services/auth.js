import { OAUTH_CLIENT_ID } from '../config.js'

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_KEY = 'erp_tracker_token'
const TOKEN_EXPIRY_KEY = 'erp_tracker_token_expiry'

let tokenClient = null

export function initGoogleAuth(onTokenChange) {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            const expiry = Date.now() + response.expires_in * 1000
            localStorage.setItem(TOKEN_KEY, response.access_token)
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString())
            onTokenChange(response.access_token)
          }
        },
      })
      resolve()
    }
    document.head.appendChild(script)
  })
}

export function signIn() {
  if (tokenClient) tokenClient.requestAccessToken()
}

export function signOut(onTokenChange) {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token)
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  onTokenChange(null)
}

export function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0)
  if (token && expiry > Date.now() + 60000) return token
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  return null
}
