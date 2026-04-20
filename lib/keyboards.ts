export function getMainMenu(
  isAdmin: boolean,
  hasTardigrades: boolean,
  hasQuestions: boolean,
  isQuizInProgress: boolean,
) {
  const buttons = [];

  if (hasTardigrades) {
    buttons.push([
      {
        action: {
          type: 'text',
          label: '👾 Тихоходка дня',
          payload: JSON.stringify({ action: 'tardigrade_day' }),
        },
        color: 'primary',
      },
    ]);
  }

  if (hasQuestions) {
    const label = isQuizInProgress ? '🔬 Продолжить квиз' : '🔬 Квиз';
    buttons.push([
      {
        action: { type: 'text', label: label, payload: JSON.stringify({ action: 'quiz' }) },
        color: 'secondary',
      },
    ]);
  }

  if (isAdmin) {
    buttons.push([
      {
        action: {
          type: 'text',
          label: '⚙️ Админ-панель',
          payload: JSON.stringify({ action: 'admin_menu' }),
        },
        color: 'negative',
      },
    ]);
  }

  return JSON.stringify({ one_time: false, buttons });
}

export function getAdminMenu(hasQuestions: boolean) {
  const buttons = [
    [
      {
        action: {
          type: 'text',
          label: '🔄 Синхронизация',
          payload: JSON.stringify({ action: 'sync_album' }),
        },
        color: 'primary',
      },
      {
        action: {
          type: 'text',
          label: '🧪 Тест выдачи',
          payload: JSON.stringify({ action: 'test_tardigrade' }),
        },
        color: 'secondary',
      },
    ],
  ];

  if (hasQuestions) {
    buttons.push([
      {
        action: {
          type: 'text',
          label: '🗑 Удалить все вопросы',
          payload: JSON.stringify({ action: 'quiz_clear' }),
        },
        color: 'negative',
      },
    ]);
  } else {
    buttons.push([
      {
        action: {
          type: 'text',
          label: '🧪 Инициализировать квиз',
          payload: JSON.stringify({ action: 'quiz_init' }),
        },
        color: 'positive',
      },
    ]);
  }

  buttons.push([
    {
      action: {
        type: 'text',
        label: '❓ Команды',
        payload: JSON.stringify({ action: 'admin_help' }),
      },
      color: 'default',
    },
    {
      action: { type: 'text', label: '◀️ Назад', payload: JSON.stringify({ action: 'back' }) },
      color: 'default',
    },
  ]);

  return JSON.stringify({ one_time: false, buttons });
}

export const quizRestartKeyboard = JSON.stringify({
  inline: true,
  buttons: [
    [
      {
        action: {
          type: 'text',
          label: '🔄 Пройти заново',
          payload: JSON.stringify({ action: 'quiz_reset' }),
        },
        color: 'positive',
      },
    ],
  ],
});
