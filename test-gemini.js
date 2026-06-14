require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY}`;
  
  const prompt = "Merhaba, bu bir test mesajıdır. Lütfen sadece 'Test başarılı' yaz.";
  
  try {
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    const aiData = await aiRes.json();
    console.log(JSON.stringify(aiData, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
testGemini();
