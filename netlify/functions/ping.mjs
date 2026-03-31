/**
 * Пример serverless-функции Netlify.
 * URL: https://<ваш-сайт>.netlify.app/.netlify/functions/ping
 */
export const handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    ok: true,
    service: 'MarTik',
    ts: new Date().toISOString(),
  }),
})
