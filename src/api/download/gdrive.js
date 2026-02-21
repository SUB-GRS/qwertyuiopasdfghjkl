const axios = require('axios'); // Kita pakai axios agar konsisten dengan endpoint sebelumnya

// Fungsi Helper untuk format size (human-readable)
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fungsi Scraper GDrive
async function GDriveDl(url) {
    try {
        let id;
        if (!(url && url.match(/drive\.google/i))) throw new Error('URL tidak valid');
        
        // Extract ID dari URL
        const match = url.match(/\/?id=([^&]+)/i) || url.match(/\/d\/(.*?)\//);
        id = match ? match[1] : null;
        if (!id) throw new Error('ID Google Drive tidak ditemukan');

        const res = await axios({
            url: `https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
            method: 'POST',
            headers: {
                'accept-encoding': 'gzip, deflate, br',
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'origin': 'https://drive.google.com',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
                'x-drive-first-party': 'DriveWebUi',
            },
            transformResponse: [(data) => data.slice(4)] // Membuang karakter anti-XSS Google
        });

        const dataJson = JSON.parse(res.data);
        const { fileName, sizeBytes, downloadUrl } = dataJson;

        if (!downloadUrl) throw new Error('Link Download Limit atau File terlalu besar (Butuh API Key)');

        // Cek mimetype dengan melakukan HEAD request
        const head = await axios.head(downloadUrl);
        const mimetype = head.headers['content-type'];

        return { 
            fileName, 
            fileSize: formatSize(sizeBytes), 
            mimetype, 
            downloadUrl 
        };
    } catch (err) {
        throw err;
    }
}

// Module Export
module.exports = function (app) {
    app.get('/download/gdrive', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter URL Google Drive wajib diisi.' 
            });
        }

        try {
            const result = await GDriveDl(url);

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: result
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: error.message || 'Gagal mengambil data dari Google Drive.' 
            });
        }
    });
};
