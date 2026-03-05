const axios = require('axios');

// --- Fungsi Helper Scraper (Logic dari kodemu) ---

async function searchYT(q) {
    const response = await axios.get(`https://test.flvto.online/search/?q=${encodeURIComponent(q)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            origin: 'https://v5.ytmp4.is',
            referer: 'https://v5.ytmp4.is/'
        }
    });
    if (!response.data.items || !response.data.items.length) throw new Error('Lagu tidak ditemukan');
    return response.data.items[0];
}

async function getDownloadLink(youtube_id) {
    const converter = await axios.post('https://ht.flvto.online/converter', {
        id: youtube_id,
        fileType: 'mp3'
    }, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'Content-Type': 'application/json',
            origin: 'https://ht.flvto.online'
        }
    });
    return converter.data;
}

// --- Controller Express ---

module.exports = function (app) {
    app.get('/search/ytmp3', async (req, res) => {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: 'Masukan judul lagu yang ingin dicari!' 
            });
        }

        try {
            // 1. Cari lagu
            const info = await searchYT(query);
            
            // 2. Ambil link download MP3
            const data = await getDownloadLink(info.id);

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: {
                    title: info.title,
                    id: info.id,
                    duration: info.duration,
                    views: info.viewCount,
                    thumbnail: info.thumbMedium,
                    url: `https://www.youtube.com/watch?v=${info.id}`,
                    downloadUrl: data.link,
                    filesize: data.filesize
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: "Gagal memproses lagu. Coba judul lain." 
            });
        }
    });
};
