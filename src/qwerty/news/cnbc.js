const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scraper CNBC Indonesia
 * Mengambil berita terbaru dari kategori News
 */
async function scrapeCNBCNews() {
  try {
    const { data: html } = await axios.get("https://www.cnbcindonesia.com/news", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const results = [];

    // Mengambil elemen article yang berisi list berita
    $("article").each((_, element) => {
      const $article = $(element);
      const $link = $article.find("a");

      const link = $link.attr("href");
      const image = $link.find("img").attr("src");
      const categoryRaw = $link.find("span.text-cnbc-support-orange").text().trim() || "";
      const title = $link.find("h2").text().trim();
      const label = $link.find("span.bg-cnbc-primary-blue").text().trim();
      const date = $link.find("span.text-gray").text().trim();

      if (title && link) {
        results.push({
          title,
          link,
          image: image || null,
          category: categoryRaw.replace("Video", "").trim(),
          label: label.replace(/\s+/g, " ").trim(),
          date: date.replace(/\s+/g, " ").trim(),
          is_video: categoryRaw.toLowerCase().includes("video")
        });
      }
    });

    return results;
  } catch (error) {
    throw new Error("Gagal mengambil berita CNBC: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /news/cnbc
   * Deskripsi: Scrape berita ekonomi dan bisnis terbaru dari CNBC Indonesia.
   */
  app.get('/news/cnbc', async (req, res) => {
    try {
      const news = await scrapeCNBCNews();
      
      if (news.length === 0) {
        return res.status(404).json({
          status: false,
          message: "Tidak ada berita ditemukan."
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
