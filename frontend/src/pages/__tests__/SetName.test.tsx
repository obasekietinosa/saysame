import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SetName } from '../SetName';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';
import { API_URL } from '../../config';

describe('SetName Component UI', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <Routes>
          <Route path="/set-name" element={<SetName />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("WHAT'S YOUR NAME?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('shows error if name is empty', async () => {
    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <Routes>
          <Route path="/set-name" element={<SetName />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  });

  it('shows error when fetch fails', async () => {
    server.use(
      http.post(API_URL + '/room/spec-123/players', () => {
        return HttpResponse.json({ error: 'Room not found' }, { status: 404 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/set-name?roomId=spec-123']}>
        <Routes>
          <Route path="/set-name" element={<SetName />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Joiner' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Room not found')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    server.use(
      http.post(API_URL + '/room', async () => {
        await new Promise((r) => setTimeout(r, 100)); // Delay response
        return HttpResponse.json({ roomId: '123', playerId: 'abc', playerName: 'Test' });
      })
    );

    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <Routes>
          <Route path="/set-name" element={<SetName />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Test' },
    });
    const button = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(button);

    // Should disable input and button and show 'Continuing...'
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Continuing...');
    expect(screen.getByPlaceholderText('Enter your name')).toBeDisabled();

    // Wait for the simulated request to finish so we don't leak async logic
    await waitFor(() => {
        expect(sessionStorage.getItem('playerId')).toBe('abc');
    });
  });
});
