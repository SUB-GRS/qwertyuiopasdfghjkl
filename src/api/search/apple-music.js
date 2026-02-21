const axios = require('axios');

/**
 * Memformat URL track agar sesuai dengan standar music.apple.com
 */
function toAppleMusicUrl(trackViewUrl, trackId) {
  if (!trackViewUrl) return null;
  try {
    const u = new URL(trackViewUrl);
    const origin = 'https://music.apple.com';
    const path = u.pathname;
    const params = new URLSearchParams();
    if (trackId) params.set('i', String(trackId));
    params.set('uo', '4');
    return `${origin}${path}?${params.toString()}`;
  } catch {
    return null;
  }
}

/**
 * Mencari lagu di iTunes/Apple Music API
 */
async function searchAppleMusic(query) {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://itunes.apple.com/search',
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: 5
      },
      timeout: 10000
    });

    const songs = (response.data.results || []).map(item => ({
      trackId: item.trackId || null,
      title: item.trackName || null,
      artist: item.artistName || null,
      album: item.collectionName || null,
      thumbnail: item.artworkUrl100 || null,
      previewUrl: item.previewUrl || null,
      appleUrl: toAppleMusicUrl(item.trackViewUrl, item.trackId) || item.trackViewUrl || null
    }));

    return songs;
  } catch (error) {
    throw new Error("Gagal mengambil data dari Apple Music: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /search/apple-music
   * Deskripsi: Mencari lagu dan metadata di platform Apple Music.
   */
  app.get('/search/apple-music', async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'q' (judul lagu/artis) wajib diisi."
      });
    }

    try {
      const result = await searchAppleMusic(q);
      
      res.status(200).json({
        status: true,
        creator: "dyzen - Autobot API",
        query: q,
        total: result.length,
        result: result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};
