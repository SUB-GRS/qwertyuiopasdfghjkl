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
    app.get('/maker/tomirror', async (req, res) => {
        const { url } = req.query;
        const fixedPrompt = `Make a photo using this face.
This will be the description of the photo
Person in the image [DO NOT CHANGE SUBJECT'S FACIAL FEATURES] A very ordinary iPhone mirror selfie with no clear subject or framing; a careless snapshot. The photo has a little motion blur and is slightly overexposed due to uneven light. The angle is awkward, the composition is non-existent, and the overall effect is aggressively mediocre - like an accidental photo taken while taking the phone out of your pocket to take a selfie The subject takes a shaky iPhone mirror selfie at night, before he goes out.
He wears a classic black suit jacket over a crisp white dress shirt, finished with a slim black tie that's slightly loosened at the collar and a sunglass. The white shirt cuff peeks from the sleeve. He is touching his hair. in a dimly lit room with no lights on except for the harsh phone flashlight, which creates stark highlights and blown-out reflections. The phone is very close to the mirror. The photo has a vertical aspect ratio of 9:16. Neon lights are faintly visible from the outside.`; 

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
