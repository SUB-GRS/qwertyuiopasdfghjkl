const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Logic Scraper Telegram Profile
 */
async function stalkTelegram(username) {
    try {
        // Bersihkan username kalau user input pakai '@'
        const target = username.replace('@', '');
        const url = `https://t.me/${target}`;

        // Request ke halaman profil publik Telegram
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        // Ambil data dari elemen HTML
        const result = {
            name: $('.tgme_page_title span').text().trim() || $('meta[property="og:title"]').attr('content'),
            username: `@${target}`,
            bio: $('.tgme_page_description').text().trim() || $('meta[property="og:description"]').attr('content'),
            subscribers: $('.tgme_page_extra').text().trim(), // Biasanya berisi jumlah subs/members
            image: $('.tgme_page_photo_image').attr('src'),
            url: url
        };

        // Validasi jika akun tidak ada
        if (!result.name || result.name.includes("Telegram: Contact")) {
            throw new Error('Username tidak ditemukan atau akun di-private.');
        }

        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Handler Express
 */
module.exports = function (app) {
    app.get('/stalk/telegram', async (req, res) => {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ 
                status: false, 
                message: "Masukkan username Telegram yang mau di-stalk, bro!" 
            });
        }

        try {
            const data = await stalkTelegram(username);
            
            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: data
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });
};
