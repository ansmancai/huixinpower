export async function onRequestPost({ request }) {
  return new Response(JSON.stringify({ message: 'test' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}