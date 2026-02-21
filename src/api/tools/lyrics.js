const axios = require('axios');

/**
 * Fungsi untuk mengambil lirik dari LRCLIB API
 */
async function scrapeLyrics(query) {
  try {
    const { data } = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'referer': `https://lrclib.net/`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!data || data.length === 0) {
      throw new Error("Lirik lagu tidak ditemukan.");
    }

    // Ambil hasil pertama (paling relevan) dan format datanya
    return data.map(item => ({
      id: item.id,
      title: item.trackName,
      artist: item.artistName,
      album: item.albumName,
      duration: Math.floor(item.duration / 60) + ":" + (item.duration % 60).toString().padStart(2, '0'),
      lyrics: item.plainLyrics || "Lirik instrumen / tidak tersedia.",
      syncedLyrics: item.syncedLyrics || null
    }));
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /search/lyrics
   * Deskripsi: Mencari lirik lagu berdasarkan judul atau artis
   */
  app.get('/search/lyrics', async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'q' (query lagu) wajib diisi."
      });
    }

    try {
      const result = await scrapeLyrics(q);
      
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        total: result.length,
        data: result[0], // Mengembalikan hasil paling relevan
        all_results: result.slice(0, 5) // Opsi hasil lainnya
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};
