const axios = require('axios');
const FormData = require('form-data');
const { randomBytes } = require('crypto');

const BASE = 'https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-unblur';
const UA = { 'user-agent': 'Kevyll-API/1.0' };

function randomHex(len) {
  return randomBytes(len).toString('hex');
}

// Reuse fungsi yang sama untuk job & polling
async function createJob(buffer, filename) {
  const serial = randomHex(16);
  const form = new FormData();
  form.append('original_image_file', buffer, { filename, contentType: 'image/jpeg' });
  form.append('scale_factor', 2);
  form.append('upscale_type', 'image-upscale');
  const { data } = await axios.post(`${BASE}/create-job`, form, {
    headers: { ...form.getHeaders(), 'product-serial': serial, ...UA },
  });
  return data.result.job_id;
}

async function pollUntilDone(jobId) {
  const timeout = Date.now() + 180000;
  while (Date.now() < timeout) {
    const { data } = await axios.get(`${BASE}/get-job/${jobId}`, {
      headers: { 'product-serial': randomHex(16), ...UA },
    });
    if (data.code === 100000 && data.result?.output_url?.[0]) return data.result.output_url[0];
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Timeout');
}

module.exports = function (app) {
  /**
   * @endpoint /ai/upscale-view
   * Output: Direct Image (Buffer)
   */
  app.get('/tools/hd', async (req, res) => {
    const { imageUrl } = req.query;

    if (!imageUrl) return res.status(400).send("Parameter imageUrl dibutuhkan.");

    try {
      // 1. Ambil gambar asli
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // 2. Proses Upscale
      const jobId = await createJob(buffer, 'image.jpg');
      const outputUrl = await pollUntilDone(jobId);

      // 3. Ambil hasil gambar dari outputUrl sebagai buffer
      const finalImage = await axios.get(outputUrl, { responseType: 'arraybuffer' });

      // 4. SET HEADER SEBAGAI GAMBAR
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24 jam agar hemat server
      
      // 5. KIRIM BUFFER GAMBAR
      res.send(Buffer.from(finalImage.data));

    } catch (error) {
      res.status(500).send("Gagal memproses gambar: " + error.message);
    }
  });
};
