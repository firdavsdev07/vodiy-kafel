/**
 * Frontend-only stub for the contact form.
 *
 * There is no backend in this project yet, so nothing leaves the browser.
 * When the API exists, replace the body of `submitEnquiry` with the real
 * request — the component contract (payload in, `{ ok, reference }` out)
 * is designed so no UI has to change.
 */
export async function submitEnquiry(payload) {
  await new Promise((resolve) => setTimeout(resolve, 650))

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock] enquiry submitted — not sent anywhere', payload)
  }

  const reference = `VK-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
  return { ok: true, reference }
}
