import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLang } = req.body;
    
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Text and targetLang are required' });
    }

    const targetLanguageName = targetLang === 'tr' ? 'Turkish' : 'English';

    const prompt = `Translate the following text to ${targetLanguageName}.
Keep the translation natural and preserve emojis if any. 
Do not add any explanations or quotes, ONLY return the translated text.

Text to translate:
"${text}"`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let translatedText = result.response.text().trim();

    return res.status(200).json({ translatedText });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
