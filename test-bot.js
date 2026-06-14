const fetch = require('node-fetch');

async function test() {
  console.log('Testing bot endpoint locally...');
  try {
    const res = await fetch('http://localhost:3000/api/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          sender_id: '123',
          message_text: 'Merhaba, nasılsın?'
        }
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}
test();
