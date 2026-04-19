const axios = require('axios');
const cheerio = require('cheerio');

// Fungsi Scraper Otakudesu Detail
async function otakudesuDetail(url) {
    try {
        const { data: html } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' 
            }
        });

        const $ = cheerio.load(html);
        const detail = {
            title: $('.jdlrx h1').text().trim(),
            poster: $('.fotoanime img').attr('src'),
            info: {},
            episodes: []
        };

        $('.infozingle p').each((_, el) => {
            const key = $(el).find('b').first().text().trim().replace(':', '');
            if (!key) return;

            const raw = $(el).text().trim();
            const value = raw.split(':')[1]?.trim();
            detail.info[key.toLowerCase().replace(/\s/g, '_')] = value || null;
        });

        // Ambil Genre secara spesifik
        detail.info.genre = [];
        $('.infozingle a[rel="tag"]').each((_, el) => {
            detail.info.genre.push($(el).text().trim());
        });

        // Daftar Episode
        $('.episodelist ul li').each((_, el) => {
            const a = $(el).find('a');
            detail.episodes.push({
                title: a.text().trim(),
                url: a.attr('href'),
                date: $(el).find('.zeebr').text().trim()
            });
        });

        return detail;
    } catch (err) {
        throw new Error('Gagal mengambil detail anime. Pastikan URL benar.');
    }
}

// Controller Express
module.exports = function (app) {
    app.get('/anime/otakudesu', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Masukkan parameter url Otakudesu, bro.' 
            });
        }

        try {
            const result = await otakudesuDetail(url);
            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: result
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};
