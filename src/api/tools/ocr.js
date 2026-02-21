const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Fungsi untuk memproses OCR ke provider eksternal
 */
async function processOCR(buffer, originalName) {
    const url = "https://staging-ai-image-ocr-266i.frontend.encr.app/api/ocr/process";
    
    // Deteksi mimeType sederhana
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        throw new Error("Tipe file tidak didukung. Harap gunakan PNG, JPG, atau JPEG.");
    }

    const imageBase64 = buffer.toString("base64");

    const res = await axios.post(url, 
        { imageBase64, mimeType },
        { headers: { "content-type": "application/json" } }
    );

    if (res.status !== 200) {
        throw new Error(`Gagal memproses OCR: ${res.statusText}`);
    }

    return { extractedText: res.data.extractedText };
}

module.exports = function (app) {
    /**
     * @endpoint /ai/ocr
     * Deskripsi: Mengekstrak teks dari gambar (Optical Character Recognition)
     */
    app.get('/ai/ocr', async (req, res) => {
        const { imageUrl } = req.query;

        if (!imageUrl) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'imageUrl' wajib diisi.",
                usage: "/ai/ocr?imageUrl=https://example.com/image.jpg"
            });
        }

        let tempFilePath = null;

        try {
            // 1. Ambil gambar dari URL menggunakan axios (arraybuffer)
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageResponse.data, 'binary');
            
            // 2. Tentukan nama file sementara
            const tempDir = os.tmpdir();
            const fileName = `ocr-${uuidv4()}.jpg`;
            tempFilePath = path.join(tempDir, fileName);

            // 3. Simpan sementara untuk validasi/proses (opsional, tapi mengikuti struktur asli Anda)
            fs.writeFileSync(tempFilePath, buffer);

            // 4. Proses OCR
            const result = await processOCR(buffer, imageUrl);

            // 5. Kirim Response
            res.status(200).json({
                success: true,
                data: result,
                creator: "dyzen",
                processed_at: new Date().toISOString()
            });

        } catch (err) {
            console.error("OCR Error:", err.message);
            res.status(500).json({
                success: false,
                error: err.message || "Terjadi kesalahan saat memproses OCR."
            });
        } finally {
            // 6. Cleanup file sementara jika ada
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (e) {
                    console.error("Gagal menghapus file temp:", e.message);
                }
            }
        }
    });
};
