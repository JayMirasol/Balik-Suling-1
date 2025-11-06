// Netlify Function (CommonJS): Exchange Authorization Code for Access Token (PKCE)
// Environment required:
// - SPOTIFY_CLIENT_ID (should match REACT_APP_SPOTIFY_CLIENT_ID)
// - SPOTIFY_REDIRECT_URI (must exactly match the one sent to Spotify authorize)

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { code, code_verifier, redirect_uri } = JSON.parse(event.body || "{}");
    const client_id = process.env.SPOTIFY_CLIENT_ID || process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || redirect_uri;

    if (!client_id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing SPOTIFY_CLIENT_ID env" }) };
    }
    if (!code || !code_verifier || !redirectUri) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing code, code_verifier, or redirect_uri" }) };
    }

    const body = new URLSearchParams({
      client_id,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier,
    });

    const resp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await resp.json();

    return {
      statusCode: resp.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Error", details: String(err) }) };
  }
};
