const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi utama untuk scraping berita terbaru dari situs resmi JKT48
 */
async function scrapeJKT48News() {
  try {
    const { data: html } = await axios.get('https://jkt48.com/news/list?lang=id', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const results = [];

    $('.entry-news__list').each((_, el) => {
      const $item = $(el);
      
      // Lewati elemen jika merupakan navigasi pagination
      if ($item.hasClass('entry-news__list--pagination')) return;

      const title = $item.find('.entry-news__list--item h3 a').text().trim();
      const relativeLink = $item.find('.entry-news__list--item h3 a').attr('href');
      const date = $item.find('.entry-news__list--item time').text().trim();
      const relativeIcon = $item.find('.entry-news__list--label img').attr('src');

      if (title && relativeLink) {
        results.push({
          title,
          link: 'https://jkt48.com' + relativeLink,
          date,
          label_icon: relativeIcon ? 'https://jkt48.com' + relativeIcon : null
        });
      }
    });

    return results;
  } catch (error) {
    throw new Error("Gagal mengambil data dari JKT48 Website: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /news/jkt48
   * Deskripsi: Mengambil daftar berita terbaru dari website JKT48.com.
   */
  app.get('/news/jkt48', async (req, res) => {
    try {
      const news = await scrapeJKT48News();
      
      if (news.length === 0) {
        return res.status(404).json({
          status: false,
          message: "Tidak ada berita ditemukan saat ini."
        });
      }

      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        total: news.length,
        data: news,
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
