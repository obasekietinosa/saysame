import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config';

export function useLobbyPolling() {
  return useQuery({
    queryKey: ['lobby', sessionStorage.getItem('playerId')],
    queryFn: async () => {
      const playerId = sessionStorage.getItem('playerId');
      const playerName = sessionStorage.getItem('playerName');

      if (!playerId || !playerName) {
        throw new Error('Missing player details. Please go back to home.');
      }

      const res = await fetch(`${API_URL}/lobby/${playerId}`);

      if (res.status === 404) {
        // Re-register
        const reRegRes = await fetch(`${API_URL}/lobby`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName }),
        });

        if (!reRegRes.ok) {
          throw new Error('Failed to rejoin lobby');
        }

        const data = await reRegRes.json();
        if (data.message === 'waiting') {
           sessionStorage.setItem('playerId', data.playerId);
        }
        return data;
      } else if (!res.ok) {
        throw new Error('Error checking lobby state');
      } else {
        return res.json();
      }
    },
    refetchInterval: (query) => {
      // Stop polling if we have a room id
      if (query.state.data && query.state.data.id) {
         return false;
      }
      return 2000;
    },
    retry: true,
  });
}
