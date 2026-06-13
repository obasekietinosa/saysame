import { render, screen, fireEvent, waitFor, act } from '../../utils/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Share } from '../Share';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../config';
import { vi } from 'vitest';

describe('Share Component UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders correctly with room link', () => {
    server.use(
      http.get(API_URL + '/room/test-room', () => {
        return HttpResponse.json({
          id: 'test-room',
          players: [
            { id: 'p1', name: 'Player 1', words: [] },
            { id: undefined, name: undefined, words: [] }
          ]
        });
      })
    );
    render(
      <MemoryRouter initialEntries={['/share?roomId=test-room']}>
        <Routes>
          <Route path="/share" element={<Share />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Share this link!')).toBeInTheDocument();
    const input = screen.getByTestId('share-link-input') as HTMLInputElement;
    expect(input.value).toContain('/set-name?roomId=test-room');
  });

  it('shows error if roomId is missing', () => {
    render(
      <MemoryRouter initialEntries={['/share']}>
        <Routes>
          <Route path="/share" element={<Share />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Room ID is missing')).toBeInTheDocument();
  });

  it('copies link to clipboard', async () => {
    server.use(
      http.get(API_URL + '/room/test-room', () => {
        return HttpResponse.json({
          id: 'test-room',
          players: [
            { id: 'p1', name: 'Player 1', words: [] },
            { id: undefined, name: undefined, words: [] }
          ]
        });
      })
    );

    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });

    render(
      <MemoryRouter initialEntries={['/share?roomId=test-room']}>
        <Routes>
          <Route path="/share" element={<Share />} />
        </Routes>
      </MemoryRouter>
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/set-name?roomId=test-room'));

    // We mock fake timers but the UI update might need act/advance timers
    act(() => {
      vi.advanceTimersByTime(10);
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('polls the server and navigates when a second player joins', async () => {
    let callCount = 0;

    server.use(
      http.get(API_URL + '/room/test-room', () => {
        callCount++;
        if (callCount === 1) {
          // First poll: no second player
          return HttpResponse.json({
            id: 'test-room',
            players: [
              { id: 'p1', name: 'Player 1', words: [] },
              { id: undefined, name: undefined, words: [] } // Simulate how backend structure might look or just not have id
            ]
          });
        }

        // Second poll: second player has joined
        return HttpResponse.json({
          id: 'test-room',
          players: [
            { id: 'p1', name: 'Player 1', words: [] },
            { id: 'p2', name: 'Player 2', words: [] }
          ]
        });
      })
    );

    let currentPath = '';

    const LocationDisplay = () => {
      currentPath = window.location.pathname; // actually react-router handles this better with useLocation
      return null;
    };

    const TestApp = () => (
      <MemoryRouter initialEntries={['/share?roomId=test-room']}>
        <Routes>
          <Route path="/share" element={<Share />} />
          <Route path="/room/:id" element={<div data-testid="room-page">Room Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    render(<TestApp />);

    // Fast-forward first poll
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Nothing should happen yet
    expect(screen.queryByTestId('room-page')).not.toBeInTheDocument();

    // Fast-forward second poll
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should have navigated
    await waitFor(() => {
      expect(screen.getByTestId('room-page')).toBeInTheDocument();
    });
  });
});
