import dotenv from 'dotenv';
import { updates } from '../bot.js';
dotenv.config({ path: '.env.local' });

// Запускаем long polling только в dev-режиме
updates
  .startPolling()
  .then(() => console.log('🤖 Long Poll bot started (DEV)'))
  .catch((err) => {
    console.error('Failed to start polling:', err);
    process.exit(1);
  });
