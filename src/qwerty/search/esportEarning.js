const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi Scraper Esport Earnings
 */
async function getTeamData(teamName) {
    const url = `https://www.esportsearnings.com/search?search=${encodeURIComponent(teamName)}&type=team`;

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const row = $('.detail_list_table tbody tr').first();

        if (!row.length || row.text().includes('No results found')) {
            throw new Error('Team not found');
        }

        return {
            status: true,
            creator: "Hazel",
            result: {
                name: row.find('td').eq(0).text().trim(),
                totalPrize: row.find('td').eq(1).text().trim(),
                tournaments: row.find('td').eq(2).text().trim(),
                link: "https://www.esportsearnings.com" + row.find('a').attr('href')
            }
        };

    } catch (err) {
        throw new Error(err.message || 'Gagal mengambil data esport.');
    }
}

// --- Handler Express ---
module.exports = function (app) {
    app.get('/api/search/esport-earning', async (req, res) => {
        const { query } = req.query; // Kita gunakan parameter ?query=

        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: "Masukkan nama tim! Contoh: /search/esport-earning?query=evos" 
            });
        }

        try {
            const data = await getTeamData(query);
            res.status(200).json(data);
        } catch (err) {
            res.status(404).json({ 
                status: false, 
                error: err.message 
            });
        }
    });
};
