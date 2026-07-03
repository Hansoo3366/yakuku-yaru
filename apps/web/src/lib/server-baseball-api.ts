import type { Game } from '@/lib/baseball-api';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api')
  .replace(/\/+$/, '');

async function requestPublic<T>(path: string, revalidate = 60 * 60) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPublicGame(gameId: number) {
  const response = await requestPublic<{ game: Game }>(`/games/${gameId}`);

  return response?.game ?? null;
}

export async function listPublicSeasonGames(seasonYear: number) {
  const params = new URLSearchParams({
    from: `${seasonYear}-03-01`,
    to: `${seasonYear + 1}-01-01`,
  });
  const response = await requestPublic<{ items: Game[] }>(
    `/games?${params.toString()}`,
  );

  return response?.items ?? [];
}
