import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyPolling } from '../hooks/useLobbyPolling';
import { Card } from '../components/Card';

export function Waiting() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { data: lobbyData, isError } = useLobbyPolling();

  useEffect(() => {
    if (isError) {
      setError('An error occurred while waiting. Please try again.');
    }
  }, [isError]);

  useEffect(() => {
    if (lobbyData && lobbyData.id) {
       navigate(`/room/${lobbyData.id}`);
    }
  }, [lobbyData, navigate]);

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
