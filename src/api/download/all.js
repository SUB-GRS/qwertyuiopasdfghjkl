const axios = require('axios');

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36';

/**
 * Universal Scraper menggunakan J2Download API
 * Mendukung: TikTok, IG, FB, YT, X, BiliBili, Spotify, dsb.
 */
async function j2download(url) {
  const baseHeaders = {
    'authority': 'j2download.com',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'user-agent': UA,
  };

  try {
    // 1. Ambil CSRF & Cookie dari halaman utama
    const home = await axios.get('https://j2download.com/', {
      headers: { 
        ...baseHeaders, 
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'upgrade-insecure-requests': '1' 
      },
    });

    const setCookies = home.headers['set-cookie'] || [];
    const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');
    const csrfToken = setCookies.find((c) => c.includes('csrf_token='))?.split('csrf_token=')[1].split(';')[0] || '';

    // 2. Request Autolink untuk mendapatkan media
    const { data } = await axios.post(
      'https://j2download.com/api/autolink',
      { data: { url, unlock: true } },
      {
        headers: {
          ...baseHeaders,
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'cookie': cookies,
          'origin': 'https://j2download.com',
          'referer': 'https://j2download.com/id',
          'x-csrf-token': csrfToken,
        },
      }
    );

    return data;
  } catch (error) {
    throw new Error("Gagal mengambil data dari provider: " + (error.response?.data?.message || error.message));
  }
}

module.exports = function (app) {
  /**
   * @endpoint /download/all
   * Deskripsi: Universal downloader untuk 70+ platform sosial media.
   */
  app.get('/download/all', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi."
      });
    }

    try {
      const result = await j2download(url);
      
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: result,
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
