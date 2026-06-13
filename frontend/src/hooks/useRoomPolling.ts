import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoomState } from '../utils/api';

export type Player = {
  id: string;
  name: string;
  words: string[];
};

export type RoomState = {
  id: string;
  lastUpdatedAt: string;
  currentRound: number;
  totalRounds: number;
  currentRoundState: 'PENDING' | 'NO_MATCH' | 'MATCH';
  players: [Player, Player];
};

export function useRoomPolling(roomId: string | null, lastUpdatedAtRef?: React.MutableRefObject<string | null>) {
  const queryClient = useQueryClient();

  return useQuery<RoomState>({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const res = await getRoomState(roomId!, lastUpdatedAtRef?.current);
      if (res.status === 304) {
         // Return previous data from cache
         return queryClient.getQueryData(['room', roomId]) as RoomState;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch room state');
      }
      const data = await res.json();
      if (lastUpdatedAtRef) {
          lastUpdatedAtRef.current = data.lastUpdatedAt;
      }
      return data;
    },
    enabled: !!roomId,
    refetchInterval: (query) => {
      if (query.state.data && query.state.data.players && query.state.data.players.length === 2 && query.state.data.players[1].id) {
         // Stop polling rapidly if in share mode (no lastUpdatedAtRef), or keep polling in room mode
         if (!lastUpdatedAtRef) return false;
      }
      return 2000;
    },
    retry: true,
  });
}
