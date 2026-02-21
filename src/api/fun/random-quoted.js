const axios = require('axios');

// Cache sederhana untuk menyimpan daftar quotes di memori
let quotesCache = null;

/**
 * Fungsi untuk mengambil semua quotes dari sumber eksternal
 */
async function getQuotes() {
  if (quotesCache) return quotesCache;

  try {
    const { data } = await axios.get('https://api.npoint.io/b19365077c38660b93fb', {
      timeout: 5000
    });

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Format data quotes tidak valid.");
    }

    quotesCache = data;
    return quotesCache;
  } catch (error) {
    throw new Error("Gagal mengambil database quotes: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /fun/random-quote
   * Deskripsi: Mengambil satu kutipan secara acak dari database.
   */
  app.get('/fun/random-quote', async (req, res) => {
    try {
      const quotes = await getQuotes();
      
      // Algoritma pemilihan acak
      const randomIndex = Math.floor(Math.random() * quotes.length);
      const randomQuote = quotes[randomIndex];

      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: {
          quote: randomQuote.quote || randomQuote.text,
          by: randomQuote.by || randomQuote.author || "Unknown"
        }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message
      });
    }
  });
};
