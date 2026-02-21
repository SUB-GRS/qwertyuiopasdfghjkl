const axios = require("axios");

/**
 * Fungsi Nembak API Brat Video
 * Menghasilkan Buffer Video MP4
 */
async function getBratVideo(text) {
    try {
        // Kita gunakan source API yang support format video/gif brat
        const response = await axios.get(`https://aqul-brat.hf.space/api/brat/video?text=${encodeURIComponent(text)}`, {
            responseType: 'arraybuffer',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 30000 // Video butuh waktu lebih lama (30 detik)
        });

        if (!response.data) throw new Error("Gagal generate video");
        return response.data;
    } catch (error) {
        throw new Error("Server source BratVid sedang sibuk, coba lagi nanti.");
    }
}

module.exports = function (app) {
    app.get('/maker/bratvid', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({ 
                status: false, 
                message: "Teksnya mana bro? Contoh: ?text=Gacor Banget" 
            });
        }

        try {
            const videoBuffer = await getBratVideo(text);

            // Set header biar browser/bot ngebaca ini sebagai VIDEO MP4
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', 'inline; filename="brat.mp4"');
            
            res.status(200).send(videoBuffer);

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                error: err.message 
            });
        }
    });
};
