const axios = require('axios');

module.exports = (app) => {
    // Endpoint: /api/proxy?url=https://target-website.com
    app.get('/tools/proxy', async (req, res) => {
        const targetUrl = req.query.url;

        if (!targetUrl) {
            return res.status(400).json({ status: false, message: "Parameter 'url' diperlukan." });
        }

        try {
            const response = await axios({
                method: 'get',
                url: targetUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 15000
            });

            // Mengirim balik data dari target ke client Anda
            res.send(response.data);

        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: "Proxy Error: " + error.message 
            });
        }
    });
};
