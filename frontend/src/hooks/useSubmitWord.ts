import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../config';
import { type RoomState } from './useRoomPolling';

export function useSubmitWord(roomId: string | undefined, roomState: RoomState | undefined, lastUpdatedAtRef: React.MutableRefObject<string | null>, setHasSubmittedThisRound: (val: boolean) => void, setWord: (val: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wordToSubmit, round }: { wordToSubmit: string, round: number }) => {
      const playerId = sessionStorage.getItem('playerId');
      if (!playerId) throw new Error('Player ID not found');

      const res = await fetch(`${API_URL}/room/${roomId}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          word: wordToSubmit,
          round,
        }),
      });

      if (!res.ok) {
        if (res.status === 422) {
           const data = await res.json();
           return { success: false, data };
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit word');
      }
      return { success: true, data: await res.json() };
    },
    onSuccess: (result) => {
      const data = result.data;
      queryClient.setQueryData(['room', roomId], data);
      lastUpdatedAtRef.current = data.lastUpdatedAt;

      if (roomState && data.currentRound > roomState.currentRound) {
        setHasSubmittedThisRound(false);
        setWord('');
      } else if (result.success) {
        setHasSubmittedThisRound(true);
      } else {
        setWord('');
      }
    }
  });
}
