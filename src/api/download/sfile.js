const axios = require('axios');
const cheerio = require('cheerio');

async function sfileDl(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);
        let filename = $('div.w3-row-padding').find('img').attr('alt');
        let mimetype = $('div.list').text().split(' - ')[1]?.split('\n')[0];
        let filesize = $('#download').text().replace(/Download File/g, '').replace(/\(|\)/g, '').trim();
        
        // Key random k=10-15 biasanya untuk bypass validasi dasar sfile
        let download = $('#download').attr('href') + '&k=' + Math.floor(Math.random() * (15 - 10 + 1) + 10);
        
        return { filename, filesize, mimetype, download };
    } catch (e) {
        throw new Error('Gagal mengambil data download. Pastikan URL Sfile benar.');
    }
}

module.exports = function (app) {
    app.get('/download/sfile', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, message: 'Masukkan parameter url sfile!' });

        try {
            const data = await sfileDl(url);
            res.json({ 
                status: true, 
                creator: "GooTa API", 
                result: data 
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
