const axios = require('axios');

async function spotifyDl(url) {
    try {
        // Step 1: Ambil metadata lagu
        const Response = await axios.get(`https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`, {
            headers: {
                'accept': "application/json, text/plain, */*",
                'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:116.0) Gecko/116.0 Firefox/116.0',
                'Referer': "https://spotifydownload.org/",
            },
        });

        if (!Response.data.result) throw new Error("Gagal mengambil info lagu. Pastikan URL Spotify valid.");

        // Step 2: Task Konversi ke MP3
        const yanzResponse = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${Response.data.result.gid}/${Response.data.result.id}`, {
            headers: {
                'accept': "application/json, text/plain, */*",
                'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:116.0) Gecko/116.0 Firefox/116.0',
                'Referer': "https://spotifydownload.org/",
            },
        });

        // Mapping hasil akhir
        return {
            title: Response.data.result.name,
            type: Response.data.result.type,
            artists: Response.data.result.artists,
            duration: Response.data.result.duration_ms,
            image: Response.data.result.image,
            download: `https://api.fabdl.com${yanzResponse.data.result.download_url}`
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = function (app) {
    app.get('/download/spotify', async (req, res) => {
        const { url } = req.query;

        if (!url) return res.status(400).json({ status: false, message: "Masukkan link Spotify-nya, bro!" });
        if (!url.includes('spotify.com')) return res.status(400).json({ status: false, message: "URL tidak valid. Harus dari Spotify." });

        try {
            const data = await spotifyDl(url);
            res.json({
                status: true,
                creator: "GooTa API",
                result: data
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
