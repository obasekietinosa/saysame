import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { Card } from '../components/Card';

export function Waiting() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let intervalId: number;

    const pollLobby = async () => {
      const playerId = sessionStorage.getItem('playerId');
      const playerName = sessionStorage.getItem('playerName');

      if (!playerId || !playerName) {
        setError('Missing player details. Please go back to home.');
        return;
      }

      try {
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
          } else if (data.id) {
             // Immediate match on re-register
             clearInterval(intervalId);
             navigate(`/room/${data.id}`);
          }
        } else if (!res.ok) {
          throw new Error('Error checking lobby state');
        } else {
          const data = await res.json();
          if (data.id && data.players) {
            clearInterval(intervalId);
            navigate(`/room/${data.id}`);
          }
          // If data.message === 'waiting', just keep polling
        }
      } catch (err) {
        console.error(err);
        // We do not stop polling on a single fetch error to handle transient issues
      }
    };

    // Initial check
    pollLobby();

    // Poll every 2 seconds
    intervalId = window.setInterval(pollLobby, 2000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-black text-foreground mb-8 drop-shadow-[2px_2px_0px_var(--color-secondary)] uppercase">
          Waiting for Opponent
        </h1>
        {error ? (
          <p className="text-primary font-bold">{error}</p>
        ) : (
          <div className="flex flex-col items-center space-y-8">
            <div className="w-12 h-12 border-[4px] border-border bg-secondary shadow-[4px_4px_0px_0px_var(--color-border)] animate-spin"></div>
            <p className="text-foreground font-black uppercase tracking-wide">
              We're finding someone for you to play with...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
