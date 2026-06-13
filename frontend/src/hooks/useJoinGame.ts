import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { joinRandomLobby, joinRoom, createFriendRoom } from '../utils/api';

export function useJoinGame(mode: string | null, roomId: string | null, name: string) {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      if (mode === 'random') {
        const data = await joinRandomLobby(name.trim());
        return { type: 'random', data };
      } else if (roomId) {
        const data = await joinRoom(roomId, name.trim());
        return { type: 'room', data };
      } else if (mode === 'friend') {
        const data = await createFriendRoom(name.trim());
        return { type: 'friend', data };
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
        if (data.roomId) {
          sessionStorage.setItem('playerId', data.playerId);
          sessionStorage.setItem('playerName', data.playerName);
          navigate(`/room/${data.roomId}`);
        } else if (data.id) {
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
