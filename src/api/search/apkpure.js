const axios = require('axios');
const cheerio = require('cheerio');

async function searchApkpure(q) {
    const end = 'https://m.apkpure.com';
    const url = `${end}/cn/search?q=${encodeURIComponent(q)}&t=app`;
    
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36'
        }
    });
    
    const $ = cheerio.load(response.data);
    const searchData = [];

    $('ul.search-res li').each((index, element) => {
        const $element = $(element);
        const linkPath = $element.find('a.dd').attr('href');
        
        if (linkPath) {
            searchData.push({
                name: $element.find('.p1').text().trim(),
                developer: $element.find('.p2').text().trim(),
                link: end + linkPath,
                image: $element.find('img').attr('src'),
                tags: $element.find('.tags .tag').map((i, el) => $(el).text().trim()).get(),
                fileSize: $element.find('.right_button a.is-download').attr('data-dt-filesize'),
                version: $element.find('.right_button a.is-download').attr('data-dt-version')
            });
        }
    });
    return searchData;
}

module.exports = function (app) {
    app.get('/search/apkpure', async (req, res) => {
        const { q } = req.query;
        if (!q) return res.status(400).json({ status: false, message: "Parameter 'q' (query) wajib diisi!" });

        try {
            const results = await searchApkpure(q);
            res.json({
                status: true,
                creator: "GooTa API",
                result: results
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });
};
