export async function onRequestPost({ request }) {
  return new Response(JSON.stringify({ message: 'login ok' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}