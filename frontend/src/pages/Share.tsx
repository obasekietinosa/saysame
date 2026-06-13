import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoomPolling } from '../hooks/useRoomPolling';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function Share() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const roomId = searchParams.get('roomId');

  useEffect(() => {
    if (!roomId) {
      setError('Room ID is missing');
    }
  }, [roomId]);

  const { data: roomData, isError } = useRoomPolling(roomId);

  useEffect(() => {
    if (isError) {
       console.error("Error polling room");
    }
  }, [isError]);

  useEffect(() => {
    if (roomData && roomData.players && roomData.players.length === 2 && roomData.players[1].id) {
      navigate(`/room/${roomId}`);
    }
  }, [roomData, navigate, roomId]);

  if (!roomId || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <p className="text-primary font-black text-xl">{error || 'Invalid access'}</p>
        </Card>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/set-name?roomId=${roomId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-black text-foreground mb-4 drop-shadow-[2px_2px_0px_var(--color-secondary)] uppercase">
          Share this link!
        </h1>
        <p className="text-foreground font-medium mb-8">
          Send this link to your friend so they can join the game. The game will start automatically when they join.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <Input
            type="text"
            readOnly
            value={shareLink}
            className="flex-1 bg-muted"
            data-testid="share-link-input"
          />
          <Button
            onClick={copyToClipboard}
            variant="primary"
            className="w-full md:w-auto min-w-[120px]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        <div className="flex justify-center items-center space-x-4">
          <div className="w-8 h-8 border-[4px] border-border bg-secondary shadow-[4px_4px_0px_0px_var(--color-border)] animate-spin"></div>
          <p className="text-foreground font-black uppercase tracking-wide">Waiting for opponent...</p>
        </div>
      </Card>
    </div>
  );
}
