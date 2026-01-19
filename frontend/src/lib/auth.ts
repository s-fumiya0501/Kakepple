// Token storage keys
const ACCESS_TOKEN_KEY = 'kakepple_access_token';
const REFRESH_TOKEN_KEY = 'kakepple_refresh_token';

// Token management functions
export const authToken = {
  // Get access token from localStorage
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  // Get refresh token from localStorage
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Save tokens to localStorage
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  // Clear all tokens (logout)
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Check if user has tokens (is logged in)
  isAuthenticated: (): boolean => {
    return !!authToken.getAccessToken();
  },

  // Parse tokens from URL fragment (for OAuth callback)
  parseTokensFromUrl: (): { accessToken: string; refreshToken: string } | null => {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  },

  // Handle OAuth callback - parse and store tokens, clear URL fragment
  handleOAuthCallback: (): boolean => {
    const tokens = authToken.parseTokensFromUrl();
    if (tokens) {
      authToken.setTokens(tokens.accessToken, tokens.refreshToken);
      // Clear the URL fragment
      window.history.replaceState(null, '', window.location.pathname);
      return true;
    }
    return false;
  }
};
