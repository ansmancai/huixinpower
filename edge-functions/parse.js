export function onRequest() {
  return new Response(JSON.stringify({ message: 'parse ok' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}