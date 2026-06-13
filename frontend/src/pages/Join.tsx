import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function Join() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/set-name?roomId=${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-4xl font-black text-foreground mb-4 text-center drop-shadow-[2px_2px_0px_var(--color-primary)] uppercase">
          Join a Game
        </h1>
        <p className="text-foreground font-medium mb-8 text-center">
          Enter the room code shared by your friend to join their game.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room Code"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!roomId.trim()}
          >
            Join
          </Button>
        </form>
      </Card>
    </div>
  );
}
