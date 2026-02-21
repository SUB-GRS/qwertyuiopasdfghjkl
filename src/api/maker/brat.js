const axios = require("axios");

/**
 * Fungsi Nembak API Brat (Tanpa Sharp/Canvas lokal)
 */
async function getBratImage(text) {
    try {
        const response = await axios.get(`https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(text)}`, {
            responseType: 'arraybuffer', // Penting: Biar dapet data gambar mentah
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
            },
            timeout: 15000
        });

        if (!response.data) throw new Error("API Sumber tidak merespon");
        return response.data;
    } catch (error) {
        throw new Error("Gagal mengambil gambar dari source.");
    }
}

module.exports = function (app) {
    app.get('/maker/brat', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({ 
                status: false, 
                message: "Parameter 'text' wajib diisi, bro!" 
            });
        }

        try {
            const imageBuffer = await getBratImage(text);

            // Langsung set header jadi image
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache biar gak nembak terus
            
            // Kirim gambarnya
            res.status(200).send(imageBuffer);

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                error: err.message 
            });
        }
    });
};
