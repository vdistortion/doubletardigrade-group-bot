import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  }
  return _supabase;
}

export interface Tardigrade {
  id: number; text: string; description: string | null; image: string | null;
}

export interface QuizQuestion {
  id: number; question: string; options: string[]; correct: number;
}

export async function getTardigrades(): Promise<Tardigrade[]> {
  const { data } = await getSupabase().from('tardigrades').select('*');
  return (data as Tardigrade[]) || [];
}

export async function getTodayTardigrade(userId: string): Promise<{ tardigrade: Tardigrade; isNew: boolean }> {
  const today = new Date().toISOString().split('T');
  interface Row { tardigrades: Tardigrade | null; }
  const { data: existing } = await getSupabase()
      .from('daily_tardigrades').select('tardigrades(*)').eq('user_id', userId).eq('date', today).single<Row>();

  if (existing?.tardigrades) return { tardigrade: existing.tardigrades, isNew: false };

  const list = await getTardigrades();
  if (list.length === 0) return { tardigrade: { id: 0, text: 'Тихоходок пока нет', description: '', image: null }, isNew: true };

  const random = list[Math.floor(Math.random() * list.length)];
  await getSupabase().from('daily_tardigrades').insert([{ user_id: userId, tardigrade_id: random.id, date: today }]);
  return { tardigrade: random, isNew: true };
}

export async function syncAlbum(groupId: number, albumId: number, vkUserApi: any) {
  const response = await vkUserApi.photos.get({ owner_id: -groupId, album_id: albumId, count: 1000 });
  const records = response.items.map((p: any) => {
    const lines = (p.text || '').split('\n');
    return {
      text: lines || 'Без названия',
      description: lines.slice(1).join('\n') || null,
      image: `photo${p.owner_id}_${p.id}`
    };
  });
  await getSupabase().from('tardigrades').delete().neq('id', 0);
  const { data } = await getSupabase().from('tardigrades').insert(records).select();
  return data?.length || 0;
}

export async function getQuestions(): Promise<QuizQuestion[]> {
  const { data } = await getSupabase().from('quiz_questions').select('*');
  return (data as QuizQuestion[]) || [];
}

export async function addQuizQuestion(question: string, options: string[], correct: number) {
  await getSupabase().from('quiz_questions').insert([{ question, options, correct }]);
}

export async function deleteQuestion(id: number) {
  await getSupabase().from('quiz_questions').delete().eq('id', id);
}

export async function deleteAllQuestions() {
  await getSupabase().from('quiz_questions').delete().neq('id', 0);
}

export async function getUnansweredQuestion(userId: string): Promise<QuizQuestion | null> {
  const { data: answered } = await getSupabase().from('quiz_answers').select('question_id').eq('user_id', userId);
  const ids = answered?.map(a => a.question_id) || [];
  let query = getSupabase().from('quiz_questions').select('*');
  if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`);
  const { data } = await query;
  if (!data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

export async function saveQuizAnswer(userId: string, qId: number, isCorrect: boolean) {
  await getSupabase().from('quiz_answers').upsert({ user_id: userId, question_id: qId, is_correct: isCorrect }, { onConflict: 'user_id,question_id' });
}

export async function getQuizStats(userId: string) {
  const { data } = await getSupabase().from('quiz_answers').select('is_correct').eq('user_id', userId);
  const questions = await getQuestions();
  const total = questions.length;
  const answered = data?.length || 0;
  const correct = data?.filter(d => d.is_correct).length || 0;
  const percent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  return { total, answered, correct, percent };
}

export async function resetQuiz(userId: string) {
  await getSupabase().from('quiz_answers').delete().eq('user_id', userId);
}