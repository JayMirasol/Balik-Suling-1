import axios from "axios";

const authEndpoint = "https://accounts.spotify.com/authorize?";
const clientId = "10ff71b2181a4ee19909431870ef03f4";
const redirectUri = "http://localhost:3000";
const scopes = ["user-library-read", "playlist-read-private"];

export const loginEndpoint = `${authEndpoint}client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent([
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" "))}&response_type=token&show_dialog=true`;

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
