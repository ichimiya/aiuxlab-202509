import axios, { AxiosRequestConfig } from "axios";

function normalizeBase(url?: string) {
  if (!url) return undefined;
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function resolveBaseURL() {
  const explicit = normalizeBase(
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL,
  );
  if (explicit) return explicit;

  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    // ブラウザでは同一オリジンの相対パスを使う（ポートに自動追従）
    return "/api";
  }

  // SSR/NodeではPORT/HOSTから組み立て（開発ポートの自動切替に追随）
  const host = process.env.HOST || "localhost";
  const port = process.env.PORT || "3000";
  const protocol = "http";
  return `${protocol}://${host}:${port}/api`;
}

const axiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 60000, // 60秒に延長（Perplexity API用）
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth headers, logging, etc.
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      `API Error: ${error.response?.status} ${error.config?.url}`,
      error,
    );
    return Promise.reject(error);
  },
);

// Named export for Orval
export const customInstance = <T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance(config).then((response) => response.data);
};

// Default export for compatibility
export default customInstance;
