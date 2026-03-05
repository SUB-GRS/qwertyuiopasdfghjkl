const axios = require("axios");

/**
 * 🎵 SPOTIFY SEARCH & DOWNLOADER
 * Path: /v2/search/spotify
 * Creator: D2:业
 */

module.exports = function (app) {
    app.get("/search/spotify", async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                message: "Mana judul atau link Spotify-nya, Mbut? 🗿"
            });
        }

        try {
            const response = await axios.get(
                `https://spotdown.org/api/song-details?url=${encodeURIComponent(q)}`,
                {
                    headers: {
                        "Accept": "application/json, text/plain, */*",
                        "X-API-Key": "a3ef2775f0e82665c5cdcd9e3af1487f9c25b70c5e7994f5ec57f4f1502d1c41",
                        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
                        "Referer": "https://spotdown.org/id/search"
                    }
                }
            );

            res.json({
                status: true,
                result: response.data
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.response?.data || err.message
            });
        }
    });
};