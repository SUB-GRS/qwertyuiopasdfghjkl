const axios = require('axios');

/**
 * Fungsi untuk melakukan pemendekan URL via Short Abella
 */
async function shortenUrl(longUrl) {
  try {
    const { data } = await axios.post(
      'https://short.abella.icu/api/shorten',
      { url: longUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://short.abella.icu/'
        }
      }
    );
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Provider Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error("Provider tidak merespons. Layanan mungkin sedang down.");
    } else {
      throw new Error("Gagal memproses pemendekan URL: " + error.message);
    }
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/shorturl
   * Deskripsi: Membuat URL pendek (short link)
   */
  app.get('/tools/shorturl', async (req, res) => {
    const { url } = req.query;

    // Validasi input
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi."
      });
    }

    // Validasi format URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        status: false,
        message: "Format URL tidak valid. Pastikan menyertakan http:// atau https://"
      });
    }

    try {
      const result = await shortenUrl(url);
      
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  });
};
