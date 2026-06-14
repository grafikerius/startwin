// api/moderate-avatar.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Base64 string'i mime type ve veriye ayır (data:image/jpeg;base64,...)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }
    
    const mimeType = matches[1];
    const data = matches[2];

    const prompt = `You are a strict safety moderation AI for a social app. 
Review the attached avatar image.
Does it contain any of the following?
- Nudity or sexually explicit content
- Severe violence, gore, or graphic injuries
- Terrorist content or hate symbols

Reply ONLY with a valid JSON object in this exact format:
{
  "isSafe": true or false,
  "reason": "Explain briefly in Turkish why it is unsafe, or leave empty if safe"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: data,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text().trim();
    // Gemini bazen markdown kodu içinde dönebilir (```json ... ```)
    let cleanedText = responseText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const jsonResult = JSON.parse(cleanedText);
    
    return res.status(200).json(jsonResult);
  } catch (error: any) {
    console.error('Avatar moderation error:', error);
    // Hata durumunda varsayılan olarak safe kabul etmeyip kullanıcı deneyimini bozmamak için safe dönebiliriz 
    // ama güvenlik önemliyse false dönmek daha iyidir.
    return res.status(500).json({ isSafe: false, reason: 'Yapay zeka analiz servisi şu an meşgul.' });
  }
}
