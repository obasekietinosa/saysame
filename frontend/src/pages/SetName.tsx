import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function SetName() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mode = searchParams.get('mode');
  const roomIdParam = searchParams.get('roomId');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (roomIdParam) {
        // Joining a specific room
        const res = await fetch(`${API_URL}/room/${roomIdParam}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join room');
        }

        const data = await res.json();
        sessionStorage.setItem('playerId', data.playerId);
        sessionStorage.setItem('playerName', data.playerName);
        navigate(`/room/${data.roomId}`);
      } else if (mode === 'random') {
        // Joining random lobby
        const res = await fetch(`${API_URL}/lobby`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join lobby');
        }

        const data = await res.json();
        if (data.message === 'waiting') {
          sessionStorage.setItem('playerId', data.playerId);
          sessionStorage.setItem('playerName', name.trim());
          navigate('/waiting');
        } else if (data.id) {
          // Matched immediately
          // Find our player ID from the players array
          const me = data.players.find((p: { id: string, name: string }) => p.name === name.trim());
          if (me) {
            sessionStorage.setItem('playerId', me.id);
            sessionStorage.setItem('playerName', me.name);
          }
          navigate(`/room/${data.id}`);
        }
      } else if (mode === 'friend') {
        // Creating a room to play with a friend
        const res = await fetch(`${API_URL}/room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create room');
        }

        const data = await res.json();
        sessionStorage.setItem('playerId', data.playerId);
        sessionStorage.setItem('playerName', data.playerName);
        navigate(`/share?roomId=${data.roomId}`);
      } else {
        throw new Error('Invalid game mode');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-indigo-600 mb-6 text-center">
          What's your name?
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
