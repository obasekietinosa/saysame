import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import { server } from '../setupTests';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../config';

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
};

describe('App Routing', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('navigates from Home to SetName (Friend Mode) and completes setup', async () => {
    server.use(
      http.post(API_URL + '/room', () => {
        return HttpResponse.json({ roomId: '123', playerId: 'abc', playerName: 'TestFriend' });
      })
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationDisplay />
      </MemoryRouter>
    );

    // Click Play with a Friend
    fireEvent.click(screen.getByText('Play with a Friend'));

    // Should be on SetName page
    expect(screen.getByTestId('location-display')).toHaveTextContent('/set-name?mode=friend');
    expect(screen.getByText("WHAT'S YOUR NAME?")).toBeInTheDocument();

    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'TestFriend' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Verify navigation after successful API call
    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/share?roomId=123');
      expect(sessionStorage.getItem('playerId')).toBe('abc');
      expect(sessionStorage.getItem('playerName')).toBe('TestFriend');
    });
  });

  it('navigates from Home to SetName (Random Mode - Waiting)', async () => {
    server.use(
      http.post(API_URL + '/lobby', () => {
        return HttpResponse.json({ message: 'waiting', playerId: 'xyz' });
      })
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationDisplay />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Join Random Player'));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/set-name?mode=random');

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'TestRandomWait' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/waiting');
      expect(sessionStorage.getItem('playerId')).toBe('xyz');
      expect(sessionStorage.getItem('playerName')).toBe('TestRandomWait');
    });
  });

  it('navigates from Home to SetName (Random Mode - Matched Immediately)', async () => {
    server.use(
      http.post(API_URL + '/lobby', () => {
        return HttpResponse.json({
          id: 'room-789',
          players: [{ id: 'xyz', name: 'TestRandomMatch' }, { id: 'other', name: 'Other' }]
        });
      })
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationDisplay />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Join Random Player'));

    expect(screen.getByTestId('location-display')).toHaveTextContent('/set-name?mode=random');

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'TestRandomMatch' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/room/room-789');
      expect(sessionStorage.getItem('playerId')).toBe('xyz');
      expect(sessionStorage.getItem('playerName')).toBe('TestRandomMatch');
    });
  });

  it('navigates to /join from Home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationDisplay />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Join with Code'));
    expect(screen.getByTestId('location-display')).toHaveTextContent('/join');
    // We now have the Join component implemented
    expect(screen.getByText('Join a Game')).toBeInTheDocument();
  });
});
