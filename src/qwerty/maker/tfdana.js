const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const axios = require('axios');
const path = require('path');

// Opsional: Jika kamu punya file font .ttf sendiri
// GlobalFonts.registerFromPath(path.join(__dirname, 'Arial.ttf'), 'ArialCustom');

module.exports = function (app) {
    app.get('/maker/tfdana', async (req, res) => {
        const { timezone, namaPengirim, noHpPengirim, namaTujuan, noHpTujuan, nominal: nominalStr } = req.query;

        if (!timezone || !namaTujuan || !noHpTujuan || !nominalStr || !noHpPengirim) {
            return res.status(400).json({ status: false, message: 'Parameter tidak lengkap.' });
        }

        try {
            const tz = { 'WIB': 'Asia/Jakarta', 'WITA': 'Asia/Makassar', 'WIT': 'Asia/Jayapura' }[timezone.toUpperCase()];
            const now = moment().tz(tz || 'Asia/Jakarta');
            const nominal = parseInt(nominalStr);

            const imageUrl = 'https://raw.githubusercontent.com/ChandraGO/Data-Jagoan-Project/refs/heads/master/src/MENTAHAN_DONO.jpg';
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const bgImage = await loadImage(Buffer.from(response.data));

            const canvas = createCanvas(bgImage.width, bgImage.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

            const draw = (text, x, y, font = '23px sans-serif', align = 'left', color = '#000') => {
                ctx.font = font;
                ctx.fillStyle = color;
                ctx.textAlign = align;
                ctx.fillText(text, x, y);
            };

            // Logic draw tetap sama, tapi pastikan font name 'sans-serif' atau ganti ke font yang di-register
            draw(`${now.format('D MMM YYYY • HH:mm')}`, 75, 541, '17px sans-serif', 'left','#777');
            draw(`ID DANA ${noHpPengirim.slice(0, 4)}••••${noHpPengirim.slice(-4)}`, 639, 541, '17px sans-serif', 'right','#777');
            draw(`${nominal.toLocaleString()}`, 257 , 679, 'bold 27px sans-serif', 'left', '#282125');
            draw(`ke ${namaTujuan} - ${noHpTujuan}`, 73, 708, '22px sans-serif', 'left');
            draw(`Rp${nominal.toLocaleString()}`, 623, 809, 'bold 30px sans-serif', 'right','#282125');
            
            const buffer = canvas.toBuffer('image/png');
            res.set('Content-Type', 'image/png');
            res.send(buffer);
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });
};
