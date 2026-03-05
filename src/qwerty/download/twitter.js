const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('querystring');

/**
 * Scraper function untuk Savetwt
 */
async function savetwt(url) {
    const base = 'https://savetwt.com';
    const headers = {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
        const home = await axios.get(base, { headers });
        const $ = cheerio.load(home.data);

        const token = $('input[name="_token"]').val();
        if (!token) throw new Error('Token CSRF tidak ditemukan');

        const cookies = home.headers['set-cookie'] 
            ? home.headers['set-cookie'].map(v => v.split(';')[0]).join('; ') 
            : '';

        const post = await axios.post(
            base + '/download',
            qs.stringify({
                _token: token,
                locale: 'en',
                url: url
            }),
            {
                headers: {
                    ...headers,
                    'content-type': 'application/x-www-form-urlencoded',
                    'origin': base,
                    'referer': base + '/',
                    'cookie': cookies
                }
            }
        );

        const $$ = cheerio.load(post.data);
        let results = [];

        $$('a').each((i, el) => {
            const href = $$(el).attr('href');
            const text = $$(el).text().toLowerCase();
            
            if (href && href.includes('/savetwt/proxy/')) {
                let type = 'video';
                if (href.includes('.jpg') || href.includes('.png') || href.includes('.jpeg')) {
                    type = 'image';
                } else if (text.includes('mp3') || href.includes('.mp3')) {
                    type = 'audio';
                }
                
                results.push({
                    type: type,
                    quality: text.includes('hd') ? 'HD' : 'SD',
                    url: href.startsWith('http') ? href : base + href
                });
            }
        });

        if (results.length === 0) throw new Error('Konten tidak ditemukan. Pastikan tweet mengandung media.');

        const title = $$('h1').first().text() || $$('title').text() || 'Twitter Media';
        
        return {
            status: true,
            creator: "Theresa API",
            source: 'savetwt',
            metadata: {
                title: title.trim(),
                total_media: results.length,
                original_url: url
            },
            result: results
        };

    } catch (error) {
        throw new Error(error.message || 'Gagal mengambil data dari Twitter');
    }
}

module.exports = function(app) {
    /**
     * @endpoint /download/twitter
     * Deskripsi: Scraper Twitter/X Media Downloader
     */
    app.get('/download/twitter', async (req, res) => {
        const { url } = req.query;
        const startTime = Date.now();

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi."
            });
        }

        // Regex untuk validasi URL Twitter/X
        const twitterRegex = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-0_]+\/status\/\d+/;
        if (!twitterRegex.test(url)) {
            return res.status(400).json({
                status: false,
                message: "Format URL Twitter/X tidak valid."
            });
        }

        try {
            const data = await savetwt(url);
            data.response_time = `${Date.now() - startTime}ms`;
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    });
};
