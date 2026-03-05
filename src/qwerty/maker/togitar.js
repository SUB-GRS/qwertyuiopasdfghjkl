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
    app.get('/maker/togitar', async (req, res) => {
        const { url } = req.query;
        const fixedPrompt = `Buat gambar sesuai dengan tema me, night and guitar. Gunakan wajah asli dari foto referensi tanpa mengubah bentuk wajah, struktur wajah, mata, hidung, bibir, maupun karakter ekspresi. Wajah harus tetap realistis dan identik dengan foto asli; hanya diperbolehkan peningkatan kualitas visual seperti ketajaman dan pencahayaan lembut, tanpa modifikasi bentuk wajah. pengambilan gambar: Pengambilan gambar dari sudut sedikit lebih tinggi dari posisi subjek (high angle ringan), kamera mengarah ke bawah sekitar 10–15 derajat. Jarak kamera medium–full body shot, posisi kamera agak menyamping (tidak frontal lurus), sehingga tubuh terlihat diagonal di frame. Perspektif natural eye-level yang diturunkan sedikit, memberi kesan candid, intim, dan tidak posed, seperti momen pribadi yang tertangkap kamera. Pakaian & gaya berpakaian: Kaos polos putih dengan potongan relaxed fit, celana jeans biru muda longgar, kaus kaki putih dan sepatu putih. Gaya kasual rumahan, sederhana, bersih, dan natural tanpa aksesoris berlebihan. Make up pria: sangat minimal atau no-makeup look, menampilkan kulit bersih dan natural. Rambut pria: seperti di foto, agak berantakan. Pose: subjek duduk santai di lantai bersandar ringan ke sofa. Satu kaki dilipat ke dalam, satu kaki ditekuk memanjang ke depan. Tubuh sedikit condong ke gitar, kepala menunduk fokus pada senar. Tangan kiri memegang fretboard, tangan kanan memetik senar gitar, ekspresi wajah tenang dan reflektif, pose natural tanpa kesan dipaksakan. latar belakang:Ruang tamu indoor bergaya cozy–minimalis pada malam hari. Terlihat sofa kain warna gelap dengan bantal putih, karpet bermotif vintage di lantai kayu, jendela besar dengan tirai tertutup menandakan suasana malam, meja samping kecil serta ada lampu tidur yang menyala tapi cahaya minim, serta keranjang anyaman di sudut ruangan. ruangan minim cahaya dan terkesan remang remang, tenang, dan intim seperti ruang pribadi rumah. detail kecil:ada minuman kalengan didepannya. cahaya: Pencahayaan hanya berasal dari flash kamera, cahaya putih netral, intensitas sedang tidak terlalu terang dan tidak terlalu gelap menyebar terbatas pada area depan, menghasilkan bayangan tegas namun tetap lem.`; 

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
