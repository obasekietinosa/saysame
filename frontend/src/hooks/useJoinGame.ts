import { useMutation } from '@tanstack/react-query';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

export function useJoinGame(mode: string | null, roomId: string | null, name: string) {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      if (mode === 'random') {
        const res = await fetch(`${API_URL}/lobby`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join lobby');
        }
        return { type: 'random', data: await res.json() };
      } else if (roomId) {
        const res = await fetch(`${API_URL}/room/${roomId}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join room');
        }
        return { type: 'room', data: await res.json() };
      } else if (mode === 'friend') {
        const res = await fetch(`${API_URL}/room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create room');
        }
        return { type: 'friend', data: await res.json() };
      } else {
        throw new Error('Invalid game mode');
      }
    },
    onSuccess: ({ type, data }) => {
      if (type === 'random') {
        if (data.message === 'waiting') {
           sessionStorage.setItem('playerId', data.playerId);
           sessionStorage.setItem('playerName', name.trim());
           navigate('/waiting');
        } else if (data.id) {
           const me = data.players.find((p: { id: string, name: string }) => p.name === name.trim());
           if (me) {
              sessionStorage.setItem('playerId', me.id);
              sessionStorage.setItem('playerName', me.name);
           }
           navigate(`/room/${data.id}`);
        }
      } else if (type === 'room') {
        if (data.id) {
          const me = data.players.find((p: { id: string, name: string }) => p.name === name.trim());
          if (me) {
            sessionStorage.setItem('playerId', me.id);
            sessionStorage.setItem('playerName', me.name);
          }
          navigate(`/room/${data.id}`);
        }
      } else if (type === 'friend') {
        sessionStorage.setItem('playerId', data.playerId);
        sessionStorage.setItem('playerName', data.playerName);
        navigate(`/share?roomId=${data.roomId}`);
      }
    }
  });
}
