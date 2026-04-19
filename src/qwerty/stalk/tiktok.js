const axios = require('axios');
const cheerio = require('cheerio');

/**
 * TikTok Profile Stalker Core Logic
 * Mengekstrak data user, statistik, dan status verifikasi.
 */
async function tiktokStalk(username) {
  try {
    const cleanUser = username.replace('@', '');
    const url = `https://www.tiktok.com/@${cleanUser}`;
    
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      timeout: 10000
    };

    const { data: html } = await axios.get(url, config);
    const $ = cheerio.load(html);

    // TikTok menyimpan data profil dalam script JSON '__UNIVERSAL_DATA_FOR_REHYDRATION__'
    const scriptTag = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!scriptTag) throw new Error("Gagal menemukan data profil. Akun mungkin privat atau tidak ada.");

    const parsedData = JSON.parse(scriptTag);
    const userInfo = parsedData.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;

    if (!userInfo) throw new Error("Struktur data TikTok berubah atau user tidak ditemukan.");

    const { user, stats } = userInfo;

    return {
      user: {
        id: user.id,
        username: user.uniqueId,
        nickname: user.nickname,
        avatar: user.avatarLarger || user.avatarMedium,
        signature: user.signature,
        verified: user.verified,
        region: user.region,
        is_private: user.privateAccount,
        follower_count: stats.followerCount,
        following_count: stats.followingCount,
        heart_count: stats.heartCount,
        video_count: stats.videoCount,
        friend_count: stats.friendCount
      }
    };
  } catch (error) {
    throw new Error(`TikTok Stalk Error: ${error.message}`);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/tiktok-stalk
   * Parameter: username (e.g. khabylame)
   */
  app.get('/stalk/tiktok', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ 
        status: false, 
        message: "Parameter 'username' wajib diisi." 
      });
    }

    try {
      const data = await tiktokStalk(username);
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: data
      });
    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message 
      });
    }
  });
};
