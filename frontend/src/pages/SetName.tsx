import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJoinGame } from '../hooks/useJoinGame';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function SetName() {
  const [name, setName] = useState('');
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode');
  const roomId = searchParams.get('roomId');

  const mutation = useJoinGame(mode, roomId, name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
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
              disabled={mutation.isPending}
              autoFocus
            />
          </div>
          {mutation.error && <p className="text-primary font-bold text-sm text-center">{mutation.error instanceof Error ? mutation.error.message : 'An unexpected error occurred'}</p>}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? 'Continuing...' : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
