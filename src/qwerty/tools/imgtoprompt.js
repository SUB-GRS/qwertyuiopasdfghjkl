const axios = require('axios');

/**
 * Logic Scraper Image to Prompt
 * Mengambil deskripsi/prompt dari sebuah gambar (Base64)
 */
async function img2toPrompt(base64Image, feature = 'image-to-prompt-en', language = 'en') {
    try {
        const response = await axios.post(
            'https://wabpfqsvdkdjpjjkbnok.supabase.co/functions/v1/unified-prompt-dev',
            { feature, language, image: base64Image },
            {
                responseType: 'stream',
                headers: {
                    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYnBmcXN2ZGtkanBqamtibm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNjk5MjEsImV4cCI6MjA1Mjk0NTkyMX0.wGGq1SWLIRELdrntLntBz-QH-JxoHUdz8Gq-0ha-4a4',
                    'content-type': 'application/json',
                    'origin': 'https://generateprompt.ai',
                    'referer': 'https://generateprompt.ai/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        );

        return new Promise((resolve, reject) => {
            let result = '';
            let buffer = '';

            response.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const raw = line.slice(5).trim();
                    if (raw === '[DONE]') continue; // Skip jika stream selesai
                    try {
                        const json = JSON.parse(raw);
                        const text = json?.choices?.[0]?.delta?.content || json?.content || json?.text || '';
                        result += text;
                    } catch (e) {
                        // Abaikan error parsing baris stream yang tidak lengkap
                    }
                }
            });

            response.data.on('end', () => resolve(result.trim()));
            response.data.on('error', (err) => reject(err));
        });
    } catch (error) {
        throw new Error("Gagal menghubungi AI Provider: " + error.message);
    }
}

/**
 * Handler Express
 */
module.exports = function (app) {
    app.get('/tools/img2prompt', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Masukkan parameter 'url' gambar yang mau dijadikan prompt, bro!"
            });
        }

        try {
            // 1. Download gambar dari URL lalu convert ke Base64
            const imgResponse = await axios.get(url, { responseType: 'arraybuffer' });
            const mime = imgResponse.headers['content-type'];
            const base64 = `data:${mime};base64,${Buffer.from(imgResponse.data).toString('base64')}`;

            // 2. Jalankan fungsi Image to Prompt
            const prompt = await img2toPrompt(base64);

            if (!prompt) throw new Error("AI tidak memberikan respon.");

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: prompt
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
