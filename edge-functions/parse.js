export async function onRequestPost({ request }) {
  return new Response(JSON.stringify({ message: 'ok' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}