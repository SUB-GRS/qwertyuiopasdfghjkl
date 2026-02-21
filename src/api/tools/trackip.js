const axios = require('axios');

const ipinfoToken = '882ffefc502ce1'; // Token kamu aman di sini

/**
 * Fungsi Pelacak IP
 */
async function getIPInfo(ip) {
    try {
        const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${ipinfoToken}`);
        return response.data;
    } catch (error) {
        throw new Error("Gagal mengambil data IP. Pastikan IP valid atau Token benar.");
    }
}

module.exports = function (app) {
    app.get('/tools/trackip', async (req, res) => {
        // Ambil IP dari query, jika kosong ambil IP pengirim request
        let ip = req.query.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Jika IP berbentuk localhost/ipv6 local, bisa dihandle atau beri default
        if (ip === '::1' || ip === '127.0.0.1') {
            ip = '8.8.8.8'; // Contoh default ke DNS Google jika ngetest di lokal
        }

        try {
            const data = await getIPInfo(ip);
            
            res.status(200).json({
                status: true,
                creator: "GooTa",
                result: {
                    ip: data.ip,
                    hostname: data.hostname || "N/A",
                    city: data.city,
                    region: data.region,
                    country: data.country,
                    loc: data.loc, // Koordinat (Latitude, Longitude)
                    org: data.org, // ISP / Provider
                    postal: data.postal,
                    timezone: data.timezone,
                    maps: `https://www.google.com/maps/?q=${data.loc}`
                }
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                error: err.message 
            });
        }
    });
};
