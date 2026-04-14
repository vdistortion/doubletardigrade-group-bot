import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bot from '../bot.js';
import {log} from "node:util";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

function verifyVKSignature(body: string, signature: string, secret: string): boolean {
    const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64');

    return hash === signature;
}

export default async (req: VercelRequest, res: VercelResponse) => {
    const body = req.body;

    if (!body) {
        res.status(400).send('Empty body');
        return;
    }

    // Проверка подписи (если есть секретный ключ)
    if (process.env.VK_SECRET_KEY) {
        const signature = req.headers['x-gamification-signature'] as string;
        const bodyString = JSON.stringify(body);

        if (!signature || !verifyVKSignature(bodyString, signature, process.env.VK_SECRET_KEY)) {
            res.status(403).send('Invalid signature');
            return;
        }
    }

    if (body?.type === 'confirmation') {
        res.status(200).send(process.env.CONFIRMATION);
        return;
    }

    try {
        await bot.handleWebhookUpdate(body);
        res.status(200).send('ok');
    } catch (error) {
        console.error('Ошибка при обработке вебхука VK:', error);
        res.status(500).send('Error handling webhook');
    }
};

console.log(process.env.CONFIRMATION)