export function getMainMenu(isAdmin: boolean, hasTardigrades: boolean, hasQuestions: boolean, isQuizInProgress: boolean) {
  const buttons = [];

  if (hasTardigrades) {
    buttons.push([{
      action: { type: 'text', label: '👾 Тихоходка дня', payload: JSON.stringify({ action: 'tardigrade_day' }) },
      color: 'primary'
    }]);
  }

  if (hasQuestions) {
    const quizLabel = isQuizInProgress ? '🔬 Продолжить квиз' : '🔬 Квиз';
    buttons.push([{
      action: { type: 'text', label: quizLabel, payload: JSON.stringify({ action: 'quiz' }) },
      color: 'secondary'
    }]);
  }

  if (isAdmin) {
    buttons.push([{
      action: { type: 'text', label: '⚙️ Админ-панель', payload: JSON.stringify({ action: 'admin_menu' }) },
      color: 'negative'
    }]);
  }

  return JSON.stringify({ one_time: false, buttons });
}

export const adminMenuKeyboard = JSON.stringify({
  one_time: false,
  buttons: [
    [
      { action: { type: 'text', label: '🔄 Синхронизация', payload: JSON.stringify({ action: 'sync_album' }) }, color: 'primary' },
      { action: { type: 'text', label: '🧪 Тест выдачи', payload: JSON.stringify({ action: 'test_tardigrade' }) }, color: 'secondary' }
    ],
    [
      { action: { type: 'text', label: '❓ Команды', payload: JSON.stringify({ action: 'admin_help' }) }, color: 'default' }
    ],
    [{ action: { type: 'text', label: '◀️ Назад', payload: JSON.stringify({ action: 'back' }) }, color: 'default' }]
  ]
});

export const quizRestartKeyboard = JSON.stringify({
  inline: true,
  buttons: [[{ action: { type: 'text', label: '🔄 Пройти заново', payload: JSON.stringify({ action: 'quiz_reset' }) }, color: 'positive' }]]
});