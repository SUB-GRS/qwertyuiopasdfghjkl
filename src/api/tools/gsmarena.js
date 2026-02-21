const axios = require('axios');

// Fungsi Scraper (Bisa ditaruh di folder /lib)
async function searchGSMArena(query) {
    const headers = {
        'accept': '*/*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': 'https://m.gsmarena.com/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
    };

    const response = await axios.get('https://m.gsmarena.com/search-json.php3', {
        headers,
        params: { sSearch: query }
    });
    return response.data;
}

// Endpoint Module
module.exports = function (app) {
    app.get('/tools/gsmarena', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter query (q) diperlukan.' 
            });
        }

        try {
            const result = await searchGSMArena(q);

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: result
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: 'Gagal mengambil data dari GSMArena.' 
            });
        }
    });
};
