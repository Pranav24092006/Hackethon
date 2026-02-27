// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render login form fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should show error when fields are empty', async () => {
    render(<LoginForm />);

    const loginButton = screen.getByRole('button', { name: /Login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter both username and password/i)).toBeInTheDocument();
    });
  });

  it('should call login API with correct credentials', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { username: 'testuser', role: 'ambulance' },
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
    });
  });

  it('should store token and redirect on successful login (ambulance)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { username: 'testuser', role: 'ambulance' },
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('username', 'testuser');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('role', 'ambulance');
      expect(window.location.href).toBe('/ambulance');
    });
  });

  it('should redirect to police dashboard for police role', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { username: 'officer', role: 'police' },
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'officer' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(window.location.href).toBe('/police');
    });
  });

  it('should show error message on failed login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during login', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  token: 'mock-token',
                  user: { username: 'testuser', role: 'ambulance' },
                }),
              }),
            100
          )
        )
    );

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    expect(screen.getByText(/Logging in.../i)).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const loginButton = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should display demo account information', () => {
    render(<LoginForm />);

    expect(screen.getByText(/Demo Accounts:/i)).toBeInTheDocument();
    expect(screen.getByText(/ambulance1/i)).toBeInTheDocument();
    expect(screen.getByText(/police1/i)).toBeInTheDocument();
  });
});
