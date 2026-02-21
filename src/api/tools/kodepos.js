const axios = require('axios');

/**
 * Scraper fungsi untuk mencari kode pos dari nomor.net
 */
async function cariKodePos(namaDaerah) {
  try {
    const response = await axios.post(
      `https://www.nomor.net/_kodepos.php?_i=cari-kodepos&jobs=${encodeURIComponent(namaDaerah)}`,
      {},
      {
        headers: {
          'Referer': 'https://www.nomor.net/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000
      }
    );

    const htmlData = response.data;
    // Regex untuk mengekstrak data dari elemen anchor dengan class ktw
    const matches = [...htmlData.matchAll(/class="ktw" title="(?:.+?)" rel="nofollow">(.+?)<\/a>/g)];
    
    if (matches.length === 0) {
      throw new Error(`Data tidak ditemukan untuk wilayah: ${namaDaerah}`);
    }

    // Ambil 5 elemen pertama (Kode Pos, Desa, Kec, Kab, Prov)
    const elements = matches.map(match => match[1].replace(/<\/?b>/g, '')).slice(0, 5);

    // Ekstrak kode wilayah (biasanya muncul setelah elemen utama)
    const kodeWilayahMatch = htmlData.match(/class="ktw" rel="nofollow">(.+?)<\/a>/);
    const kodeWilayah = kodeWilayahMatch ? kodeWilayahMatch[1] : null;

    return {
      kodepos: elements[0] || "-",
      desa: elements[1] || "-",
      kecamatan: elements[2] || "-",
      kabupaten: elements[3] || "-",
      provinsi: elements[4] || "-",
      kode_wilayah: kodeWilayah,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/cek-kodepos
   * Deskripsi: Mencari informasi kode pos wilayah di Indonesia.
   */
  app.get('/tools/cek-kodepos', async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'query' (nama daerah) wajib diisi."
      });
    }

    try {
      const data = await cariKodePos(query);
      
      res.status(200).json({
        status: true,
        creator: "dyzen - Gota API",
        data: data
      });
    } catch (err) {
      const statusCode = err.message.includes("tidak ditemukan") ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        message: err.message
      });
    }
  });
};
