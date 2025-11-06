import axios from "axios";

// Spotify OAuth config
const authEndpoint = "https://accounts.spotify.com/authorize?";
// Allow overriding via env in production; fallback to current value for dev
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID || "10ff71b2181a4ee19909431870ef03f4";
// Use deployed origin by default; overrideable via env. Avoid hardcoding localhost.
const redirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || (typeof window !== "undefined" ? window.location.origin : "");

export const loginEndpoint = `${authEndpoint}client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent([
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
