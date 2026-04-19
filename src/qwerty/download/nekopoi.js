const axios = require('axios');
const cheerio = require('cheerio');

// Fungsi Scraper (Bisa dipindah ke /lib/nekopoi.js)
const getVideoNeko = (url) => new Promise((resolve, reject) => {
    axios.get(url)
        .then((req) => {
            try {
                const links = [];
                const soup = cheerio.load(req.data);
                const title = soup("title").text();
                
                // Mengambil link download dari elemen div.liner
                soup('div.liner').each((i, e) => {
                    soup(e).find('div.listlink a').each((j, s) => {
                        links.push({
                            name: soup(s).text().trim(),
                            url: soup(s).attr('href')
                        });
                    });
                });

                if (links.length === 0) return reject(new Error("Link download tidak ditemukan"));

                resolve({ title, links });
            } catch (err) {
                reject(err);
            }
        })
        .catch((err) => reject(new Error("Gagal mengakses URL Nekopoi")));
});

// Module Export
module.exports = function (app) {
    app.get('/download/nekopoi', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter URL Nekopoi wajib diisi, bro.' 
            });
        }

        try {
            const result = await getVideoNeko(url);

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
