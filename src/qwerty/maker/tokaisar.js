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
    app.get('/maker/tokaisar', async (req, res) => {
        const { url } = req.query;
        const fixedPrompt = `Depict me wearing the costume of Emperor Hirohito from Japanese history, incorporating the clothing design seen in Mobile Legends. Create his signature pose, characterized by stark cinematic lighting and intense contrast.Captured with a slightly low, upward-facing angle that dramatizes the subject's jawline and neck, the composition evokes quiet dominance and sculptural elegance. The background is a deep, saturated crimson red, creating a bold visual clash with the model's luminous skin and dark wardrobe. Lighting is tightly directional, casting warm golden highlights on one side of the face while plunging the other into velvety shadow, emphasizing bone structure with almost architectural precision. The subject's expression is unreadable and cool-toned-eyes halt-lidded, lips relaxed-suggesting detachment or quiet defiance. The model wears a heavy wool or felt overcoat, its texture richly defined against the skin's smooth, dewy glow. Minimal retouching preserves skin texture and slight imperfections, adding realism. Editorial tension is created through close cropping, tonal control, and the almost oppressive intimacy of the camera's proximity. There are no props or accessories; the visual impact is created purelythrough light, shadow, color saturation, and posture-evoking high fashion, contemporary isolation, and hyper-modern masculinity. Make the face and hairstyle as similar as possible to the one in the photo. Make the costume highly detailed and realistic.Maintain the same hairstyle and color, and use similar colors and textures.`; 

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
