const axios = require('axios');

/**
 * Pinterest Scraper - Advanced Fingerprinting Version
 * Mengeksploitasi endpoint BaseSearchResource dengan header sec-ch-ua lengkap.
 */
async function pinterestScraper(query) {
  const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
  const params = {
    source_url: '/search/pins/?q=' + encodeURIComponent(query),
    data: JSON.stringify({
      options: {
        isPrefetch: false,
        query: query,
        scope: 'pins',
        no_fetch_context_on_resource: false
      },
      context: {}
    }),
    _: Date.now()
  };

  const headers = {
    'accept': 'application/json, text/javascript, */*, q=0.01',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'dnt': '1',
    'referer': 'https://www.pinterest.com/',
    'sec-ch-ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
    'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Microsoft Edge";v="133.0.3065.92", "Chromium";v="133.0.6943.142"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-platform-version': '"10.0.0"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    'x-app-version': 'c056fb7',
    'x-pinterest-appstate': 'active',
    'x-pinterest-pws-handler': 'www/[username]/[slug].js',
    'x-pinterest-source-url': '/hargr003/cat-pictures/',
    'x-requested-with': 'XMLHttpRequest'
  };

  try {
    // Menghapus 'httpsAgent: agent' karena variabel agent tidak didefinisikan di lingkungan Anda
    const { data } = await axios.get(baseUrl, { headers, params, timeout: 15000 });
    
    const results = data.resource_response?.data?.results || [];
    if (results.length === 0) throw new Error("Data kosong atau kueri tidak ditemukan.");

    const mappedData = results.map(item => ({
      id: item.id || '',
      grid_title: item.grid_title || '',
      images_url: item.images?.['736x']?.url || item.images?.orig?.url || '',
      pin: item.id ? `https://www.pinterest.com/pin/${item.id}` : '',
      link: item.link || '',
      created_at: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : ''
    })).filter(item => item.images_url); // Filter data yang tidak memiliki gambar

    return mappedData;
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    throw new Error(`Pinterest API Error [${status || 'N/A'}]: ${msg}`);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /search/pin-image
   */
  app.get('/search/pin-image', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi." });
    }

    try {
      const data = await pinterestScraper(q);
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        total: data.length,
        data: data
      });
    } catch (err) {
      res.status(500).json({ 
        status: false, 
        creator: "dyzen UI", 
        error: err.message 
      });
    }
  });

  /**
   * @endpoint /search/pin-video
   * Catatan: Data dari payload saat ini tidak secara spesifik membedakan video URL murni (mp4).
   * Filter sementara mengambil data yang sama, video memerlukan ekstraksi dari data.story_pin_data atau extra request.
   */
  app.get('/search/pin-video', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi." });
    }

    try {
      const data = await pinterestScraper(q);
      // Asumsi logis: jika ada video, URL sumbernya terikat pada format yang berbeda. 
      // Untuk stabilitas saat ini, kita kembalikan hasil pencarian umum.
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        total: data.length,
        data: data.slice(0, 10) 
      });
    } catch (err) {
      res.status(500).json({ 
        status: false, 
        creator: "dyzen UI", 
        error: err.message 
      });
    }
  });
};
