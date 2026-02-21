const axios = require('axios');

const ORIGIN = 'https://ssvid.net';

/**
 * Helper untuk melakukan POST request ke ssvid API
 */
async function hit(path, payload) {
  const params = new URLSearchParams(payload);
  const { data } = await axios.post(`${ORIGIN}${path}`, params.toString(), {
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': ORIGIN,
      'referer': ORIGIN + '/youtube-to-mp3',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  return data;
}

/**
 * Memilih kualitas video yang tersedia
 */
function pickQuality(want, links) {
  const mp4 = links?.mp4 || {};
  const list = Object.entries(mp4)
    .map(([, v]) => v)
    .filter((v) => /\d+p/.test(v.q))
    .sort((a, b) => parseInt(b.q) - parseInt(a.q));

  if (!list.length) throw new Error('Link MP4 tidak tersedia untuk video ini.');

  const exact = list.find((v) => v.q === want);
  return exact ? exact.k : list[0].k; // Fallback ke kualitas tertinggi jika tidak ada yg cocok
}

module.exports = function (app) {
  /**
   * @endpoint /download/ytmp4
   * Deskripsi: Download video YouTube format MP4 dengan pilihan kualitas.
   */
  app.get('/download/ytmp4', async (req, res) => {
    const { url, quality = '720p' } = req.query;

    if (!url) {
      return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi." });
    }

    try {
      // 1. Search Video
      let search = await hit('/api/ajax/search', { query: url, cf_token: '', vt: 'youtube' });
      
      if (search.p === 'search') {
        if (!search.items?.length) throw new Error('Video tidak ditemukan.');
        const v = search.items[0].v;
        const videoUrl = `https://www.youtube.com/watch?v=${v}`;
        search = await hit('/api/ajax/search', { query: videoUrl, cf_token: '', vt: 'youtube' });
      }

      const vid = search.vid;
      const k = pickQuality(quality, search.links);

      // 2. Start Convert
      let convert = await hit('/api/ajax/convert', { k, vid });

      // 3. Polling jika status masih CONVERTING
      if (convert.c_status === 'CONVERTING') {
        let attempt = 0;
        while (attempt < 5) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 3000)); // Tunggu 3 detik
          convert = await hit('/api/convert/check?hl=en', { vid, b_id: convert.b_id });
          if (convert.c_status === 'CONVERTED') break;
        }
      }

      if (convert.c_status !== 'CONVERTED') {
        throw new Error('Proses konversi gagal atau memakan waktu terlalu lama. Silakan coba lagi.');
      }

      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: {
          title: search.title,
          duration: search.duration,
          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          downloadUrl: convert.dlink,
          quality: quality,
          format: 'mp4'
        },
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};
