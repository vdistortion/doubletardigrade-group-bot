import { API } from 'vk-io';

interface CachedAdmins {
  ids: number[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // Кэш админов на 5 минут
let cache: CachedAdmins = { ids: [], timestamp: 0 };

export async function getAdminsWithCache(api: API, groupId: number): Promise<number[]> {
  const now = Date.now();
  if (cache.ids.length > 0 && now - cache.timestamp < CACHE_TTL) {
    return cache.ids;
  }

  try {
    const response = await api.groups.getMembers({
      group_id: String(groupId),
      filter: 'managers',
      count: 1000,
    });

    // ВАЖНО: items содержит объекты { id, role, ... }, а не числа
    cache = {
      ids: response.items.map((m: any) => m.id as number),
      timestamp: now,
    };
    return cache.ids;
  } catch (error) {
    console.error('Ошибка при получении админов:', error);
    return cache.ids; // возвращаем устаревший кэш при ошибке
  }
}

export async function isUserAdmin(userId: number, api: API, groupId: number): Promise<boolean> {
  const admins = await getAdminsWithCache(api, groupId);
  return admins.includes(userId);
}
