/**
 * src/api/deploy/surge.js
 * Route: POST /api/deploy/surge
 * 
 * - Menerima file ZIP dari user
 * - Ekstrak ke temp folder
 * - Deploy ke Surge.sh menggunakan credentials owner
 * - Kirim file ZIP ke owner via Telegram
 * - Return URL hasil deploy
 */

const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { execSync } = require('child_process');
const axios  = require('axios');
const multer = require('multer');
const AdmZip = require('adm-zip');

// ─── CONFIG ────────────────────────────────────────────────
const SURGE_EMAIL = 'robojus222@gmail.com';
const SURGE_TOKEN = 'ef5905e2332b172e655e1b17058d4800';

// Bot Telegram dari index.js kamu
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7806501736:AAGHNcf50xbRUvFDH4rvXjLWPHwzFG0YA1I';
const OWNER_ID  = process.env.TELEGRAM_OWNER_ID  || '7925179886';

// Max file size: 50MB
const MAX_SIZE = 50 * 1024 * 1024;
// ────────────────────────────────────────────────────────────

// Multer: simpan ke memori
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.endsWith('.zip')) {
      return cb(new Error('Hanya file .zip yang diperbolehkan'), false);
    }
    cb(null, true);
  }
});

// Helper: kirim file ke Telegram
async function sendZipToTelegram(filePath, filename, senderInfo) {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('chat_id', OWNER_ID);
    form.append('caption',
      `📦 <b>ZIP Deploy Baru!</b>\n\n` +
      `📄 <b>File:</b> <code>${filename}</code>\n` +
      `🌐 <b>Domain:</b> <code>${senderInfo.domain}</code>\n` +
      `🕐 <b>Waktu:</b> <code>${new Date().toLocaleString('id-ID')}</code>\n` +
      `🔗 <b>URL:</b> ${senderInfo.url}\n\n` +
      `<i>Dikirim via Dinzo Deploy System</i>`
    );
    form.append('parse_mode', 'HTML');
    form.append('document', fs.createReadStream(filePath), { filename });

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    return true;
  } catch (err) {
    console.error('[TG SendZip Error]', err.message);
    return false;
  }
}

// Helper: generate random subdomain
function randomDomain() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var r = 'dinzo-';
  for (var i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// Helper: hapus folder secara rekursif
function rmdir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) { /* ignore */ }
}

module.exports = function (app) {
  app.post('/deploy/surge', upload.single('zipfile'), async function (req, res) {
    var tmpDir   = null;
    var tmpZip   = null;

    try {
      // Validasi file
      if (!req.file) {
        return res.status(400).json({ status: false, message: 'File ZIP wajib diupload.' });
      }

      // Tentukan domain
      var rawDomain = (req.body.domain || '').toString().trim();
      var domain = rawDomain
        ? rawDomain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
        : randomDomain();
      var fullDomain = domain + '.surge.sh';

      // Buat temp dir untuk ekstrak
      tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'dinzo-deploy-'));
      tmpZip  = path.join(os.tmpdir(), 'dinzo-' + Date.now() + '.zip');

      // Simpan buffer ZIP ke disk
      fs.writeFileSync(tmpZip, req.file.buffer);

      // Ekstrak ZIP
      var zip = new AdmZip(tmpZip);
      zip.extractAllTo(tmpDir, true);

      // Cek apakah ada index.html (langsung atau dalam subfolder)
      var deployDir = tmpDir;
      var entries = fs.readdirSync(tmpDir);

      // Jika hanya 1 folder di dalam ZIP, masuk ke dalamnya
      if (entries.length === 1) {
        var subPath = path.join(tmpDir, entries[0]);
        if (fs.statSync(subPath).isDirectory()) {
          deployDir = subPath;
        }
      }

      // Pastikan ada index.html
      var indexFile = path.join(deployDir, 'index.html');
      if (!fs.existsSync(indexFile)) {
        throw new Error('File ZIP harus mengandung index.html di root atau satu subfolder.');
      }

      // Pastikan surge terinstall
      try {
        execSync('npx surge --version', { stdio: 'pipe' });
      } catch (e) {
        // Install surge jika belum ada
        execSync('npm install -g surge', { stdio: 'pipe', timeout: 60000 });
      }

      // Deploy ke Surge dengan credentials owner
      var deployCmd = [
        'npx surge',
        '--project', '"' + deployDir + '"',
        '--domain',  '"' + fullDomain + '"',
        '--token',   SURGE_TOKEN
      ].join(' ');

      execSync(deployCmd, {
        stdio: 'pipe',
        timeout: 120000,
        env: Object.assign({}, process.env, {
          SURGE_TOKEN: SURGE_TOKEN,
          SURGE_LOGIN: SURGE_EMAIL
        })
      });

      var resultUrl = 'https://' + fullDomain;

      // Kirim ZIP ke Telegram owner
      var tgSent = await sendZipToTelegram(tmpZip, req.file.originalname, {
        domain: fullDomain,
        url: resultUrl
      });

      // Cleanup
      rmdir(tmpDir);
      if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);

      return res.json({
        status:    true,
        message:   'Deploy berhasil!',
        url:       resultUrl,
        domain:    fullDomain,
        telegram:  tgSent,
        filename:  req.file.originalname,
        size:      req.file.size
      });

    } catch (err) {
      // Cleanup on error
      if (tmpDir)  rmdir(tmpDir);
      if (tmpZip && fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);

      console.error('[SurgeDeploy Error]', err.message);

      var errMsg = err.message || 'Terjadi kesalahan saat deploy.';

      // Pesan error yang lebih ramah
      if (errMsg.includes('index.html')) {
        errMsg = 'File ZIP harus mengandung index.html di root.';
      } else if (errMsg.includes('ENOENT') || errMsg.includes('not found')) {
        errMsg = 'File tidak ditemukan atau ZIP rusak.';
      } else if (errMsg.includes('timeout')) {
        errMsg = 'Deploy timeout. Coba lagi atau periksa koneksi.';
      } else if (errMsg.includes('Unauthorized') || errMsg.includes('401')) {
        errMsg = 'Token Surge tidak valid. Hubungi admin.';
      }

      return res.status(500).json({ status: false, message: errMsg });
    }
  });

  // Handle multer errors
  app.use(function (err, req, res, next) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: false, message: 'File terlalu besar. Maksimal 50MB.' });
    }
    if (err.message && err.message.includes('.zip')) {
      return res.status(400).json({ status: false, message: err.message });
    }
    next(err);
  });
};
