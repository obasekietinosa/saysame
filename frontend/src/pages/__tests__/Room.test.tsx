import { render, screen, act, fireEvent } from '../../utils/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Room } from '../Room';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../config';

describe('Room Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem('playerId', 'p1');
    sessionStorage.setItem('playerName', 'Player 1');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  const renderRoom = () => {
    return render(
      <MemoryRouter initialEntries={['/room/room123']}>
        <Routes>
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('fetches and displays initial room state', async () => {
    server.use(
      http.get(API_URL + '/room/room123', () => {
        return HttpResponse.json({
          id: 'room123',
          lastUpdatedAt: '2023-01-01T00:00:00Z',
          currentRound: 1,
          totalRounds: 10,
          currentRoundState: 'PENDING',
          players: [
            { id: 'p1', name: 'Player 1', words: ['apple'] },
            { id: 'p2', name: 'Player 2', words: ['orange'] }
          ]
        });
      })
    );

    renderRoom();

    await act(async () => {
      await Promise.resolve();
    });

    expect(await screen.findByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();
    expect(screen.getByText('Round 2 / 10')).toBeInTheDocument();
  });

  it('submits a word and shows waiting state', async () => {
    server.use(
      http.get(API_URL + '/room/room123', () => {
        return HttpResponse.json({
          id: 'room123',
          lastUpdatedAt: '2023-01-01T00:00:00Z',
          currentRound: 0,
          totalRounds: 10,
          currentRoundState: 'PENDING',
          players: [
            { id: 'p1', name: 'Player 1', words: [] },
            { id: 'p2', name: 'Player 2', words: [] }
          ]
        });
      }),
      http.post(API_URL + '/room/room123/words', async ({ request }) => {
        const body = await request.json() as { playerId: string, word: string, round: number };
        expect(body).toEqual({ playerId: 'p1', word: 'banana', round: 0 });
        return HttpResponse.json({
          id: 'room123',
          lastUpdatedAt: '2023-01-01T00:00:01Z',
          currentRound: 0, // Round hasn't advanced because p2 hasn't submitted
          totalRounds: 10,
          currentRoundState: 'PENDING',
          players: [
            { id: 'p1', name: 'Player 1', words: [] },
            { id: 'p2', name: 'Player 2', words: [] }
          ]
        });
      })
    );

    renderRoom();

    await act(async () => {
      await Promise.resolve();
    });

    const input = await screen.findByPlaceholderText('Enter your word...');
    const submitBtn = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(input, { target: { value: 'banana' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(await screen.findByPlaceholderText('Waiting for opponent...')).toBeInTheDocument();
    expect(screen.getByText('Waiting...')).toBeInTheDocument();
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('shows game over win state', async () => {
    server.use(
      http.get(API_URL + '/room/room123', () => {
        return HttpResponse.json({
          id: 'room123',
          lastUpdatedAt: '2023-01-01T00:00:00Z',
          currentRound: 1,
          totalRounds: 10,
          currentRoundState: 'MATCH',
          players: [
            { id: 'p1', name: 'Player 1', words: ['apple'] },
            { id: 'p2', name: 'Player 2', words: ['apple'] }
          ]
        });
      })
    );

    renderRoom();

    await act(async () => {
      await Promise.resolve();
    });

    expect(await screen.findByText('Match!')).toBeInTheDocument();
    expect(screen.getByText('It took you 1 rounds to think alike.')).toBeInTheDocument();
  });
});
