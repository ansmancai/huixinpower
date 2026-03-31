export function onRequest() {
  return new Response('Edge Functions 已启用', {
    headers: { 'Content-Type': 'text/plain' }
  });
}