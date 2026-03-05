const axios = require('axios');
const FormData = require('form-data');
const jimp = require('jimp');

// --- Fungsi Upscale Logic ---
async function upscale(buffer, size = 2, anime = false) {
    const image = await jimp.read(buffer);
    const { width, height } = image.bitmap;
    let newWidth = width * size;
    let newHeight = height * size;

    const form = new FormData();
    form.append("name", "hdr-" + Date.now());
    form.append("imageName", "hdr-" + Date.now());
    form.append("desiredHeight", newHeight.toString());
    form.append("desiredWidth", newWidth.toString());
    form.append("outputFormat", "png");
    form.append("compressionLevel", "none");
    form.append("anime", anime.toString());
    form.append("image_file", buffer, {
        filename: "image.png",
        contentType: 'image/png',
    });

    const res = await axios.post("https://api.upscalepics.com/upscale-to-size", form, {
        headers: {
            ...form.getHeaders(),
            origin: "https://upscalepics.com",
            referer: "https://upscalepics.com"
        }
    });

    if (res.data.error) throw new Error("API Upscaler Error!");
    return res.data.bgRemoved; // Mengembalikan URL hasil
}

// --- Controller Express ---
module.exports = function (app) {
    app.get('/tools/hdr', async (req, res) => {
        const { url, scale, anime } = req.query;

        if (!url) return res.status(400).send("Error: Mana link fotonya, bro?");
        
        const scaleVal = [2, 4, 6, 8, 16].includes(parseInt(scale)) ? parseInt(scale) : 2;
        const isAnime = anime === 'true';

        try {
            // 1. Download gambar input
            const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
            const inputBuffer = Buffer.from(imageRes.data, 'binary');

            // 2. Kirim ke AI Upscaler
            const upscaledUrl = await upscale(inputBuffer, scaleVal, isAnime);

            // 3. Download hasil Upscale (URL ke Buffer)
            const finalRes = await axios.get(upscaledUrl, { responseType: 'arraybuffer' });
            const finalBuffer = Buffer.from(finalRes.data, 'binary');

            // 4. Kirim sebagai Image ke Browser
            res.set('Content-Type', 'image/png');
            res.set('Content-Disposition', 'inline; filename="upscaled.png"');
            res.send(finalBuffer);

        } catch (err) {
            console.error(err);
            res.status(500).send("Gagal memproses gambar: " + err.message);
        }
    });
};
