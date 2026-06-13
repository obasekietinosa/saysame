import { useQuery } from '@tanstack/react-query';
import { getLobbyState, rejoinLobby } from '../utils/api';

export function useLobbyPolling() {
  return useQuery({
    queryKey: ['lobby', sessionStorage.getItem('playerId')],
    queryFn: async () => {
      const playerId = sessionStorage.getItem('playerId');
      const playerName = sessionStorage.getItem('playerName');

      if (!playerId || !playerName) {
        throw new Error('Missing player details. Please go back to home.');
      }

      const res = await getLobbyState(playerId);

      if (res.status === 404) {
        // Re-register
        const data = await rejoinLobby(playerName);
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
