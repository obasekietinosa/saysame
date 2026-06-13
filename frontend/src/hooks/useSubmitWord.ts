import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitWord } from '../utils/api';
import { type RoomState } from './useRoomPolling';

export function useSubmitWord(roomId: string | undefined, roomState: RoomState | undefined, lastUpdatedAtRef: React.MutableRefObject<string | null>, setHasSubmittedThisRound: (val: boolean) => void, setWord: (val: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wordToSubmit, round }: { wordToSubmit: string, round: number }) => {
      const playerId = sessionStorage.getItem('playerId');
      if (!playerId) throw new Error('Player ID not found');

      return submitWord(roomId!, playerId, wordToSubmit, round);
    },
    onSuccess: (result) => {
      const data = result.data;
      if (result.status === 200 || result.status === 422) {
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
    }
  });
}
