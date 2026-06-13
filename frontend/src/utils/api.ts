import { API_URL } from '../config';

export async function joinRandomLobby(playerName: string) {
  const res = await fetch(`${API_URL}/lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to join lobby');
  }
  return res.json();
}

export async function joinRoom(roomId: string, playerName: string) {
  const res = await fetch(`${API_URL}/room/${roomId}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to join room');
  }
  return res.json();
}

export async function createFriendRoom(playerName: string) {
  const res = await fetch(`${API_URL}/room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create room');
  }
  return res.json();
}

export async function getLobbyState(playerId: string) {
  return fetch(`${API_URL}/lobby/${playerId}`);
}

export async function rejoinLobby(playerName: string) {
  const res = await fetch(`${API_URL}/lobby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) {
    throw new Error('Failed to rejoin lobby');
  }
  return res.json();
}

export async function getRoomState(roomId: string, lastUpdatedAt?: string | null) {
  const url = new URL(`${API_URL}/room/${roomId}`);
  if (lastUpdatedAt) {
    url.searchParams.append('lastUpdatedAt', lastUpdatedAt);
  }
  return fetch(url.toString());
}

export async function submitWord(roomId: string, playerId: string, word: string, round: number) {
  const res = await fetch(`${API_URL}/room/${roomId}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      word,
      round,
    }),
  });
  if (!res.ok) {
    if (res.status === 422) {
      const data = await res.json();
      return { success: false, data, status: 422 };
    }
    const data = await res.json();
    throw new Error(data.error || 'Failed to submit word');
  }
  return { success: true, data: await res.json(), status: 200 };
}
