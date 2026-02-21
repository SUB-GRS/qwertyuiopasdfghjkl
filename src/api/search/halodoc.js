const axios = require('axios');
const cheerio = require('cheerio');

async function searchHalodoc(query) {
    const url = `https://www.halodoc.com/artikel/search/${encodeURIComponent(query)}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        const articles = $('magneto-card').map((index, element) => ({
            title: $(element).find('header a').text().trim(),
            articleLink: 'https://www.halodoc.com' + $(element).find('header a').attr('href'),
            imageSrc: $(element).find('magneto-image-mapper img').attr('src'),
            healthLink: 'https://www.halodoc.com' + $(element).find('.tag-container a').attr('href'),
            healthTitle: $(element).find('.tag-container a').text().trim(),
            description: $(element).find('.description').text().trim(),
        })).get();

        return articles;
    } catch (err) {
        throw new Error('Gagal melakukan pencarian di Halodoc');
    }
}

module.exports = function (app) {
    app.get('/search/halodoc', async (req, res) => {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, message: 'Input query pencarian!' });

        try {
            const results = await searchHalodoc(query);
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
