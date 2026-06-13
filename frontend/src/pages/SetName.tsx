import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function SetName() {
  const [name, setName] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mode = searchParams.get('mode');
  const roomId = searchParams.get('roomId');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'random') {
        // Join the lobby
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
           // Direct match
           const me = data.players.find((p: { id: string, name: string }) => p.name === name.trim());
           if (me) {
              sessionStorage.setItem('playerId', me.id);
              sessionStorage.setItem('playerName', me.name);
           }
           navigate(`/room/${data.id}`);
        }
      } else if (roomId) {
        // Joining a specific room
        const res = await fetch(`${API_URL}/room/${roomId}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to join room');
        }

        const data = await res.json();
        if (data.id) {
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-4xl font-black text-foreground mb-8 text-center drop-shadow-[2px_2px_0px_var(--color-primary)]">
          WHAT'S YOUR NAME?
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <p className="text-primary font-bold text-sm text-center">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading || !name.trim()}
          >
            {loading ? 'Continuing...' : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
