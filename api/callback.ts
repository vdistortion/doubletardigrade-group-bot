import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updates } from '../bot.js';

export default async (req: VercelRequest, res: VercelResponse) => {
  const rawBody = await new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  // ✅ Проверка секретного ключа (ВК передает его прямо в теле запроса)
  if (process.env.VK_SECRET_KEY) {
    if (body.secret !== process.env.VK_SECRET_KEY) {
      console.error('Invalid secret key');
      res.status(403).send('Invalid secret key');
      return;
    }
  }

  // ✅ Обработка confirmation
  if (body.type === 'confirmation') {
    console.log('Confirmation request received');
    res.status(200).send(process.env.CONFIRMATION);
    return;
  }

  // Передаём остальные события в обработчики vk-io
  try {
    await updates.handleWebhookUpdate(body);
  } catch (error) {
    console.error('Error handling update:', error);
  }

  res.status(200).send('ok');
};

export const config = {
  api: {
    bodyParser: false,
  },
};