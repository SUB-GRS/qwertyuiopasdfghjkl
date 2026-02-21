const axios = require('axios');

// --- Fungsi Helper Scraper MP4 ---

async function searchYT(q) {
    const response = await axios.get(`https://test.flvto.online/search/?q=${encodeURIComponent(q)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            origin: 'https://v5.ytmp4.is',
            referer: 'https://v5.ytmp4.is/'
        }
    });
    if (!response.data.items || !response.data.items.length) throw new Error('Video tidak ditemukan');
    return response.data.items[0];
}

async function getMp4Download(youtube_id) {
    const converter = await axios.post('https://ht.flvto.online/converter', {
        id: youtube_id,
        fileType: 'mp4'
    }, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'Content-Type': 'application/json',
            origin: 'https://ht.flvto.online'
        }
    });

    const data = converter.data;
    if (!Array.isArray(data.formats) || !data.formats.length) throw new Error('Gagal mendapatkan format video');

    // Sorting untuk mencari resolusi tertinggi (720p atau yang tersedia teratas)
    const sorted = data.formats.sort((a, b) => b.height - a.height);
    const selected = sorted.find(v => v.qualityLabel === '720p') || sorted[0];

    return {
        title: data.title,
        quality: selected.qualityLabel,
        downloadUrl: selected.url,
        filesize: selected.sizeText || 'Unknown'
    };
}

// --- Controller Express ---

module.exports = function (app) {
    app.get('/search/ytmp4', async (req, res) => {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: 'Masukan judul video atau link YouTube!' 
            });
        }

        try {
            // 1. Cari video
            const info = await searchYT(query);
            
            // 2. Ambil link download MP4
            const videoData = await getMp4Download(info.id);

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: {
                    title: videoData.title,
                    id: info.id,
                    duration: info.duration,
                    quality: videoData.quality,
                    thumbnail: info.thumbMedium,
                    downloadUrl: videoData.downloadUrl,
                    filesize: videoData.filesize
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                status: false, 
                error: "Gagal memproses video YouTube." 
            });
        }
    });
};
