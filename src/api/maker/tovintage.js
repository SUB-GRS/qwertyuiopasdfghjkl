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
    app.get('/maker/tovintage', async (req, res) => {
        const { url } = req.query;
        const fixedPrompt = `[Technical Task: Vintage Film Transformation]
1. Color Profile: Apply a faded 35mm film aesthetic with warm yellow highlights and crushed teal shadows. Simulate Kodak Portra 400 or Fujifilm Superia color science.
2. Texture & Noise: Add organic film grain and subtle dust scratches. Apply light leaks on the edges of the frame to simulate light contamination in an old camera.
3. Lens Characteristics: Introduce slight chromatic aberration and a soft vignette. Apply a subtle "glow" or halation effect around highlights to mimic vintage glass optics.
4. Detail Level: Lower the digital sharpness to create a soft, natural film-like focus. Introduce minor motion blur or lens flare typical of vintage wide-aperture lenses.
5. Overall Vibe: 1970s retro photography style, nostalgic atmosphere, low contrast, washed-out black levels, and high dynamic range typical of scanned negative film.
Eliminate all modern digital sharpness, neon saturation, and artificial HDR looks. Output must look like an authentic physical photograph from the 20th century.`;

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
