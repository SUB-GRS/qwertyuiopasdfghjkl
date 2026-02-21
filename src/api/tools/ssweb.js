const axios = require('axios');

module.exports = (app) => {
    app.get('/api/tools/ssweb', async (req, res) => {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter URL diperlukan.' 
            });
        }

        try {
            const response = await axios.get('https://api.pikwy.com/', {
                params: {
                    tkn: 125,
                    d: 3000,
                    u: encodeURIComponent(targetUrl),
                    fs: 0, w: 1280, h: 1200, s: 100, z: 100,
                    f: 'jpg',
                    rt: 'jweb'
                },
                timeout: 20000 
            });

            if (!response.data?.iurl) {
                throw new Error('Gagal mendapatkan link gambar dari Pikwy (Response Kosong)');
            }

            const imageRes = await axios({
                url: response.data.iurl,
                method: 'GET',
                responseType: 'stream',
                timeout: 15000
            });

            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=3600'); 

            imageRes.data.pipe(res);

        } catch (error) {
            let errorMsg = error.message;
            if (error.code === 'ECONNABORTED') {
                errorMsg = 'Server Pikwy terlalu lama merespon (Timeout). Coba URL lain yang lebih ringan.';
            }

            console.error('SSWeb Error:', errorMsg);
            res.status(500).json({ 
                status: false, 
                message: 'Gagal mengambil screenshot: ' + errorMsg 
            });
        }
    });
};
