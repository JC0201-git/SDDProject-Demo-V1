/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
  readonly VITE_ENABLE_DEBUG: string;
  readonly VITE_WS_RECONNECT_DELAY_MS: string;
  readonly VITE_WS_MAX_RECONNECT_ATTEMPTS: string;
  readonly VITE_POLLING_INTERVAL_MS: string;
  readonly VITE_SESSION_TIMEOUT_HOURS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
