import { API, Upload, Updates, MessageContext } from 'vk-io';
import {
  getTodayTardigrade, syncAlbum, addQuizQuestion, deleteQuestion, deleteAllQuestions,
  getUnansweredQuestion, saveQuizAnswer, getQuizStats, resetQuiz, getTardigrades, getQuestions
} from './lib/supabase.js';
import { isUserAdmin } from './lib/admin.js';
import { getMainMenu, adminMenuKeyboard, quizRestartKeyboard } from './lib/keyboards.js';

const BOT_ICON = '👾';
const TOKEN = process.env.TOKEN;
if (!TOKEN) throw new Error('Критическая ошибка: Переменная TOKEN не найдена!');

const ADMIN_ID_ENV = process.env.SUPER_ADMINS || '';
const SUPER_ADMINS = ADMIN_ID_ENV.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

export const api = new API({ token: TOKEN });
export const userApi = new API({ token: process.env.USER_TOKEN as string });
const upload = new Upload({ api });
export const updates = new Updates({ api, upload });

export const GROUP_ID = 237639126;
let currentAlbumId = Number(process.env.ALBUM_ID);

async function checkAdmin(userId: number): Promise<boolean> {
  return SUPER_ADMINS.includes(userId) || (await isUserAdmin(userId, api, GROUP_ID));
}

updates.on('message_new', async (context: MessageContext) => {
  if (!context.isUser) return;

  const userId = context.senderId;
  const isAdmin = await checkAdmin(userId);
  const payload = context.messagePayload;
  const rawText = context.text?.trim() ?? '';
  const command = rawText.toLowerCase();

  if (isAdmin) {
    if (command.startsWith('/album ')) {
      const newId = parseInt(command.replace('/album ', '').trim());
      if (!isNaN(newId)) {
        currentAlbumId = newId;
        return context.send(`✅ ID альбома временно изменен на: ${currentAlbumId}`);
      }
    }

    if (command.startsWith('/quiz_add ')) {
      const data = rawText.replace('/quiz_add ', '').trim();
      const [q, correct, ...opts] = data.split('|');
      if (!q || isNaN(parseInt(correct)) || opts.length < 2) {
        return context.send('❌ Формат: /quiz_add вопрос|номер_ответа|вар1|вар2...');
      }
      await addQuizQuestion(q, opts, parseInt(correct));
      return context.send('✅ Вопрос добавлен!');
    }

    if (command.startsWith('/quiz_del ')) {
      const id = parseInt(command.replace('/quiz_del ', '').trim());
      if (isNaN(id)) return context.send('❌ Укажите числовой ID вопроса.');
      await deleteQuestion(id);
      return context.send(`✅ Вопрос #${id} удален.`);
    }

    if (command === '/quiz_clear') {
      await deleteAllQuestions();
      return context.send('✅ Все вопросы квиза удалены.');
    }

    if (command === '/quiz_init') {
      const tests = [
        ['Кто такие тихоходки?', '1', 'Микроскопические животные', 'Вид рыб', 'Пришельцы', 'Насекомые'],
        ['Сколько ног у тихоходки?', '3', 'Две', 'Шесть', 'Восемь', 'Десять'],
        ['Где НЕ могут выжить тихоходки?', '4', 'В открытом космосе', 'При радиации', 'В жидком кислороде', 'В жерле вулкана'],
        ['Как еще называют тихоходок?', '2', 'Водные слоны', 'Водные медведи', 'Моховые поросята', 'Морские львы']
      ];
      for (const t of tests) {
        await addQuizQuestion(t[0], t.slice(2), parseInt(t[3]));
      }
      return context.send('✅ База наполнена 4 тестовыми вопросами.');
    }
  }

  if (!payload && !['/admin', '/start'].includes(command)) return;

  try {
    const [tardigrades, questions, stats] = await Promise.all([
      getTardigrades(),
      getQuestions(),
      getQuizStats(String(userId))
    ]);

    const keyboard = getMainMenu(
        isAdmin && !context.isChat,
        tardigrades.length > 0,
        questions.length > 0,
        stats.answered > 0 && stats.answered < stats.total
    );

    if (command === '/admin' && isAdmin && !context.isChat) {
      return context.send(`${BOT_ICON} Админ-панель открыта:`, { keyboard: adminMenuKeyboard });
    }

    const action = payload?.action;

    if (action === 'admin_help') {
      const helpText = [
        '📖 Справка по командам:',
        '/admin - открыть панель управления',
        '/album [ID] - сменить ID альбома',
        '/quiz_add вопрос|номер|вар1|вар2... - добавить вопрос',
        '/quiz_del [ID] - удалить вопрос по ID',
        '/quiz_clear - удалить ВСЕ вопросы',
        '/quiz_init - забить базу 4 тестами'
      ].join('\n');
      return context.send(helpText, { keyboard: adminMenuKeyboard });
    }

    if (action === 'tardigrade_day') {
      const { tardigrade, isNew } = await getTodayTardigrade(String(userId));
      const prefix = isNew ? '🎉 Найдена новая тихоходка дня!' : '📖 Сегодня уже была найдена эта тихоходка:';
      return context.send(`${BOT_ICON} ${prefix}\n\n✨ ${tardigrade.text}\n\n🔬 ${tardigrade.description || ''}`, {
        attachment: tardigrade.image || undefined,
        keyboard
      });
    }

    if (action === 'quiz') {
      const question = await getUnansweredQuestion(String(userId));
      if (!question) {
        let resultMsg = `${BOT_ICON} Все доступные вопросы пройдены!\n📈 Результат: ${stats.correct} из ${stats.total}\n\n`;
        if (stats.percent === 100) resultMsg += '🏆 Невероятно! Это абсолютный успех!';
        else if (stats.percent === 0) resultMsg += '🌊 Тихоходки сегодня оказались хитрее. Попробуем еще раз?';
        else resultMsg += 'Хороший результат!';
        return context.send(resultMsg, { keyboard: quizRestartKeyboard });
      }

      const qKeyboard = JSON.stringify({
        inline: true,
        buttons: question.options.map((opt, idx) => [{
          action: {
            type: 'text',
            label: opt.slice(0, 40),
            payload: JSON.stringify({ action: 'quiz_ans', qid: question.id, ans: idx + 1 })
          },
          color: 'primary'
        }])
      });
      return context.send(`${BOT_ICON} Вопрос:\n\n❓ ${question.question}`, { keyboard: qKeyboard });
    }

    if (action === 'quiz_ans') {
      const { qid, ans } = payload;
      const q = questions.find(item => item.id === qid);
      if (!q) return context.send('❌ Вопрос не найден.');
      const isCorrect = q.correct === ans;
      await saveQuizAnswer(String(userId), qid, isCorrect);
      const feedback = isCorrect ? '✅ Верно!' : `❌ Неправильно. Правильный ответ: ${q.options[q.correct - 1]}`;
      await context.send(feedback);
      const nextQ = await getUnansweredQuestion(String(userId));
      if (!nextQ) {
        return context.send('Это был последний вопрос!', {
          keyboard: JSON.stringify({ inline: true, buttons: [[{ action: { type: 'text', label: 'Посмотреть результат', payload: JSON.stringify({ action: 'quiz' }) }, color: 'positive' }]] })
        });
      }
      return context.send('Следующий вопрос?', {
        keyboard: JSON.stringify({ inline: true, buttons: [[{ action: { type: 'text', label: 'Продолжить квиз', payload: JSON.stringify({ action: 'quiz' }) }, color: 'positive' }]] })
      });
    }

    if (action === 'quiz_reset') {
      await resetQuiz(String(userId));
      return context.send(`${BOT_ICON} Прогресс квиза сброшен. Можно начинать заново!`, {
        keyboard: getMainMenu(isAdmin, tardigrades.length > 0, questions.length > 0, false)
      });
    }

    if (isAdmin && !context.isChat) {
      if (action === 'admin_menu') return context.send(`${BOT_ICON} Админ-панель:`, { keyboard: adminMenuKeyboard });
      if (action === 'sync_album') {
        const count = await syncAlbum(GROUP_ID, currentAlbumId, userApi);
        return context.send(`✅ Синхронизация завершена! Объектов: ${count}`, { keyboard: adminMenuKeyboard });
      }
    }

    if (action === 'back' || command === '/start') {
      return context.send(`${BOT_ICON} Главное меню:`, { keyboard });
    }

  } catch (error) {
    console.error('Bot error:', error);
    await context.send('❌ Произошла ошибка.');
  }
});