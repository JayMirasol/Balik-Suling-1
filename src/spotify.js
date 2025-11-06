import axios from "axios";

// Spotify OAuth config
const authEndpoint = "https://accounts.spotify.com/authorize";

// IMPORTANT: Do not hardcode a fallback client id. Require env var to avoid using the wrong Spotify app.
export const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;

// Use deployed origin by default; overrideable via env. Avoid hardcoding localhost.
export const SPOTIFY_REDIRECT_URI =
  process.env.REACT_APP_SPOTIFY_REDIRECT_URI || (typeof window !== "undefined" ? window.location.origin : "");

// Warn clearly in console if misconfigured (helps diagnose Netlify env issues)
if (!SPOTIFY_CLIENT_ID) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing REACT_APP_SPOTIFY_CLIENT_ID. Set it in your environment (e.g., Netlify site settings)."
  );
}
if (!SPOTIFY_REDIRECT_URI) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing redirect URI. Set REACT_APP_SPOTIFY_REDIRECT_URI or ensure window.location.origin is available."
  );
}

// Scopes your app requests
export const SPOTIFY_SCOPES = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
];

// PKCE helpers
function base64UrlEncode(arrayBuffer) {
  let str = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let value = "";
  const randomValues = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) randomValues[i] = Math.floor(Math.random() * chars.length);
  }
  for (let i = 0; i < length; i++) value += chars[randomValues[i] % chars.length];
  return value;
}

export async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

// Start login (Authorization Code with PKCE)
export async function startSpotifyLoginPKCE() {
  if (!SPOTIFY_CLIENT_ID) {
    alert("Spotify client is not configured. Please try again later.");
    return;
  }
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  try {
    sessionStorage.setItem("pkce_code_verifier", verifier);
  } catch {}

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
    show_dialog: "true",
  });

  window.location.assign(`${authEndpoint}?${params.toString()}`);
}

// Axios client for Spotify Web API
const apiClient = axios.create({
  baseURL: "https://api.spotify.com/v1/",
});

// If Spotify returns 401 (expired/invalid token), clear and send user to /login
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      // optional: also remove token_expiry if you stored it
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

let requestInterceptorId = null;

export const setClientToken = (token) => {
  if (requestInterceptorId !== null) {
    apiClient.interceptors.request.eject(requestInterceptorId);
    requestInterceptorId = null;
  }
  requestInterceptorId = apiClient.interceptors.request.use(async function (config) {
    if (token) {
      config.headers.Authorization = "Bearer " + token;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  });
};

export const clearClientToken = () => {
  if (requestInterceptorId !== null) {
    apiClient.interceptors.request.eject(requestInterceptorId);
    requestInterceptorId = null;
  }
};

export default apiClient;
