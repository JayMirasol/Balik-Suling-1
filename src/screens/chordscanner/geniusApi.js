// src/geniusApi.js

import axios from "axios";

const geniusAccessToken = "jmH5cYPZtgkpAFkwYq4ZEGrEEIvUHlzEQQWLE_j2SoB7PgW2jd_ajub5WkkyQfbw";

export const searchLyrics = async (query) => {
  try {
    const response = await axios.get(`https://api.genius.com/search?q=${query}`, {
      headers: {
        Authorization: `Bearer ${geniusAccessToken}`
      }
    });
    return response.data.response.hits;
  } catch (error) {
    console.error("Error fetching from Genius API", error);
    return [];
  }
};
