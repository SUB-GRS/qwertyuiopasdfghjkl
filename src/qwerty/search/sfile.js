const axios = require('axios');
const cheerio = require('cheerio');

async function sfileSearch(query, page = 1) {
    try {
        const res = await axios.get(`https://sfile.mobi/search.php?q=${query}&page=${page}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(res.data);
        let result = [];
        $('div.list').each(function () {
            let title = $(this).find('a').text();
            let size = $(this).text().trim().split('(')[1];
            let link = $(this).find('a').attr('href');
            if (link) result.push({ title, size: size?.replace(')', '') || 'Unknown', link });
        });
        return result;
    } catch (e) {
        throw new Error('Gagal mencari file.');
    }
}

module.exports = function (app) {
    app.get('/search/sfile', async (req, res) => {
        const { query, page } = req.query;
        if (!query) return res.status(400).json({ status: false, message: 'Masukkan parameter query!' });

        try {
            const results = await sfileSearch(query, page || 1);
            res.json({ 
                status: true, 
                creator: "GooTa API", 
                result: results 
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
