const axios = require('axios');
const FormData = require('form-data');

// API Key default Anda (Sesuai kode asal)
const API_KEY = process.env.REMOVE_BG_KEY || 'Am8wWXzVWc8pRHpfHw1obfg5';

/**
 * Fungsi untuk memanggil API remove.bg
 */
async function removeBackground(imageUrl) {
    try {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('size', 'auto');

        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: {
                ...formData.getHeaders(),
                'X-Api-Key': API_KEY,
            },
            responseType: 'arraybuffer', // Sangat penting untuk menerima data gambar binary
            timeout: 30000
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            const errBody = Buffer.from(error.response.data).toString();
            throw new Error(`RemoveBG Error: ${error.response.status} - ${errBody}`);
        }
        throw new Error("Gagal menghubungi server RemoveBG: " + error.message);
    }
}

module.exports = function (app) {
    /**
     * @endpoint /tools/remove-bg
     * Deskripsi: Menghapus background gambar secara otomatis.
     * Output: Langsung berupa file gambar PNG.
     */
    app.get('/tools/removebg', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' (image URL) wajib diisi."
            });
        }

        try {
            const imageBuffer = await removeBackground(url);

            // Set header untuk mengirimkan file gambar langsung ke browser/bot
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', 'inline; filename="removed-bg.png"');
            res.send(imageBuffer);

        } catch (err) {
            res.status(500).json({
                status: false,
                message: err.message
            });
        }
    });
};
