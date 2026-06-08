import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Waiting } from '../Waiting';
import * as router from 'react-router-dom';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../config';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Waiting Component', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    vi.mocked(router.useNavigate).mockReturnValue(navigateMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem('playerId', 'p1');
    sessionStorage.setItem('playerName', 'Player 1');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('renders loading state initially', () => {
    server.use(
      http.get(API_URL + '/lobby/p1', () => {
        return HttpResponse.json({ message: 'waiting' });
      })
    );

    render(
      <MemoryRouter>
        <Waiting />
      </MemoryRouter>
    );

    expect(screen.getByText('Waiting for Opponent')).toBeInTheDocument();
  });

  it('navigates to room when matched on poll', async () => {
    let callCount = 0;
    server.use(
      http.get(API_URL + '/lobby/p1', () => {
        callCount++;
        if (callCount === 1) {
            return HttpResponse.json({ message: 'waiting' });
        }
        return HttpResponse.json({ id: 'room-123', players: [{}, {}] });
      })
    );

    render(
      <MemoryRouter>
        <Waiting />
      </MemoryRouter>
    );

    // First poll (initial)
    await act(async () => {
       await Promise.resolve();
    });

    expect(navigateMock).not.toHaveBeenCalled();

    // Second poll (after 2s)
    await act(async () => {
       vi.advanceTimersByTime(2000);
       await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/room/room-123');
  });

  it('re-registers and navigates if matched immediately on re-register', async () => {
    server.use(
      http.get(API_URL + '/lobby/p1', () => {
        return HttpResponse.json({ error: 'Player not found in lobby' }, { status: 404 });
      }),
      http.post(API_URL + '/lobby', () => {
        return HttpResponse.json({ id: 'room-456', players: [{}, {}] });
      })
    );

    render(
      <MemoryRouter>
        <Waiting />
      </MemoryRouter>
    );

    await act(async () => {
       await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/room/room-456');
  });
});
