import axios from "axios";

// Spotify OAuth config
const authEndpoint = "https://accounts.spotify.com/authorize?";

// IMPORTANT: Do not hardcode a fallback client id. Require env var to avoid using the wrong Spotify app.
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;

// Use deployed origin by default; overrideable via env. Avoid hardcoding localhost.
const redirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || (typeof window !== "undefined" ? window.location.origin : "");

// Warn clearly in console if misconfigured (helps diagnose Netlify env issues)
if (!clientId) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing REACT_APP_SPOTIFY_CLIENT_ID. Set it in your environment (e.g., Netlify site settings)."
  );
}
if (!redirectUri) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing redirect URI. Set REACT_APP_SPOTIFY_REDIRECT_URI or ensure window.location.origin is available."
  );
}

export const loginEndpoint = `${authEndpoint}client_id=${encodeURIComponent(
  clientId || ""
)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent([
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" "))}&response_type=token&show_dialog=true`;

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

export const setClientToken = (token) => {
  apiClient.interceptors.request.use(async function (config) {
    config.headers.Authorization = "Bearer " + token;
    return config;
  });
};

export default apiClient;
