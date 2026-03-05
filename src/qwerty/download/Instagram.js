const axios = require('axios');

/**
 * Fungsi untuk menghasilkan IP Random (Bypass filter sederhana)
 */
function randomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

/**
 * Fungsi untuk mengambil Token CSRF/Next-Action dari Gramfetchr
 */
async function getToken() {
  try {
    const res = await axios.post("https://gramfetchr.com/", "[]", {
      headers: {
        "accept": "text/x-component",
        "content-type": "text/plain;charset=UTF-8",
        "next-action": "00d6c3101978ea75ab0e1c4879ef0c686242515660",
        "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D",
        "Referer": "https://gramfetchr.com/",
      }
    });
    
    const text = res.data;
    const tokenMatch = text.match(/"([a-f0-9]{32}:[a-f0-9]{32})"/);
    if (!tokenMatch) throw new Error("Gagal mengekstraksi token keamanan.");
    return tokenMatch[1];
  } catch (error) {
    throw new Error("Gagal mengambil token dari provider: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /download/ig
   * Deskripsi: Download media Instagram (Post, Reel, IGTv)
   */
  app.get('/download/Instagram', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' Instagram wajib diisi."
      });
    }

    try {
      const token = await getToken();
      const response = await axios.post("https://gramfetchr.com/api/fetchr", {
        url,
        token,
        referer: "https://gramfetchr.com/",
        requester: randomIP(),
      }, {
        headers: {
          "accept": "*/*",
          "content-type": "application/json",
          "Referer": "https://gramfetchr.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const json = response.data;
      if (!json.success || !json.mediaItems) {
        throw new Error("Media tidak ditemukan atau akun di-private.");
      }

      const results = json.mediaItems.map((m, i) => ({
        index: i + 1,
        type: m.isVideo ? "video" : "image",
        url: "https://gramfetchr.com" + m.downloadLink,
        preview: "https://gramfetchr.com" + m.preview,
        thumbnail: "https://gramfetchr.com" + m.thumbnail,
      }));

      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: results
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};
