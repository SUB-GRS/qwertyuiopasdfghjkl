const axios = require('axios');
const FormData = require('form-data');

// --- HELPER FUNCTIONS ---
function genserial() {
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

async function upload(filename) {
    const form = new FormData();
    form.append('file_name', filename);
    const res = await axios.post('https://api.imgupscaler.ai/api/common/upload/upload-image', form, {
        headers: { 
            ...form.getHeaders(),
            'origin': 'https://imgupscaler.ai',
            'referer': 'https://imgupscaler.ai/'
        }
    });
    return res.data.result;
}

async function uploadtoOSS(putUrl, buffer, mime) {
    await axios.put(putUrl, buffer, { headers: { 'Content-Type': mime } });
    return true;
}

async function createJob(imageUrl, prompt) {
    const form = new FormData();
    form.append('model_name', 'magiceraser_v4');
    form.append('original_image_url', imageUrl);
    form.append('prompt', prompt); 
    form.append('ratio', 'match_input_image');
    form.append('output_format', 'jpg');

    const res = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job', form, {
        headers: {
            ...form.getHeaders(),
            'product-code': 'magiceraser',
            'product-serial': genserial(),
            'origin': 'https://imgupscaler.ai',
            'referer': 'https://imgupscaler.ai/'
        }
    });
    return res.data;
}

async function cekjob(jobId) {
    const res = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
        headers: { 'origin': 'https://imgupscaler.ai', 'referer': 'https://imgupscaler.ai/' }
    });
    return res.data;
}

// --- MODULE EXPORT ---
module.exports = function (app) {
    app.get('/maker/tobrewok', async (req, res) => {
        const { url } = req.query;
        const fixedPrompt = `Anda adalah ahli manipulasi penampilan wajah digital dan grooming styling.
Tugas: Tambahkan brewok/janggut yang paling sesuai dan natural pada wajah subjek.
Instruksi:
1. Analisis struktur wajah subjek untuk menentukan style brewok yang paling flattering.
2. Tumbuhkan brewok secara natural mengikuti kontur rahang, dagu, dan area mulut.
3. Sesuaikan warna brewok dengan warna rambut kepala subjek (atau sedikit lebih gelap).
4. Pilih style berdasarkan bentuk wajah: full beard, goatee, stubble, atau circle beard.
5. Tambahkan detail tekstur rambut brewok yang realistis: helai-helai rambut yang natural.
6. Pastikan brewok mengikuti skin tone dan bayangan wajah secara 3D (tidak terlihat ditempel).
7. Pertahankan semua elemen lain foto (pencahayaan, background, pakaian) tanpa perubahan.
Output: Foto realistis dengan brewok yang tumbuh natural seolah-olah memang sudah ada dari awal.`;

        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' wajib diisi." });

        try {
            // 1. Download image original
            const imageBuffer = await axios.get(url, { responseType: 'arraybuffer' });
            const mime = imageBuffer.headers['content-type'] || 'image/jpeg';
            
            // 2. Upload to Cloud Storage
            const up = await upload(`edit_${Date.now()}.jpg`);
            await uploadtoOSS(up.url, Buffer.from(imageBuffer.data), mime);

            // 3. Create Processing Job
            const targetUrl = 'https://cdn.imgupscaler.ai/' + up.object_name;
            const jobResponse = await createJob(targetUrl, fixedPrompt);

            if (jobResponse.code !== 0 && jobResponse.code !== 100000) {
                throw new Error(`API error code: ${jobResponse.code}`);
            }

            const jobId = jobResponse.result.job_id;
            let result;
            let attempts = 0;

            // 4. Polling status job (Maks 1 menit)
            while (attempts < 15) {
                await new Promise(r => setTimeout(r, 4000)); 
                result = await cekjob(jobId);
                if (result.result?.output_url && result.result.output_url.length > 0) break;
                if (result.code !== 300006 && result.code !== 100000 && result.code !== 0) throw new Error("Processing failed");
                attempts++;
            }

            if (!result.result?.output_url?.[0]) throw new Error("Result image not found");

            // 5. Download result and send as image
            const finalImage = await axios.get(result.result.output_url[0], { responseType: 'arraybuffer' });
            res.set('Content-Type', 'image/jpeg');
            return res.send(Buffer.from(finalImage.data));

        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });
};
