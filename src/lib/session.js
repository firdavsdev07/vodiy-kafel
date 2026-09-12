const SESSION_KEY = 'vk:entered'

/** The entry gate is shown once per browsing session, not once per load. */
export function hasEnteredThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function markEntered() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* private mode — the gate simply shows again next visit */
  }
}
