const axios = require('axios');

/**
 * Instagram Profile Stalker Core Logic
 * Mengekstrak metadata profil publik tanpa API Key resmi.
 */
async function instagramStalk(username) {
  try {
    const cleanUser = username.replace('@', '');
    // Menggunakan endpoint query hash atau internal profile API
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUser}`;
    
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '936619743392459', // ID krusial agar tidak terkena redirect login
        'X-ASBD-ID': '129477',
        'X-IG-WWW-Claim': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.instagram.com/${cleanUser}/`
      },
      timeout: 10000
    };

    const { data } = await axios.get(url, config);
    const user = data.data?.user;

    if (!user) throw new Error("User tidak ditemukan atau akun bersifat privat.");

    return {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        biography: user.biography,
        external_url: user.external_url,
        is_private: user.is_private,
        is_verified: user.is_verified,
        profile_pic: user.profile_pic_url_hd,
        stats: {
          followers: user.edge_followed_by?.count,
          following: user.edge_follow?.count,
          posts: user.edge_owner_to_timeline_media?.count
        }
      }
    };
  } catch (error) {
    if (error.response?.status === 404) throw new Error("Username tidak terdaftar.");
    throw new Error(`IG Stalk Error: ${error.message}`);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/ig-stalk
   * Parameter: username (e.g. jokowi)
   */
  app.get('/stalk/instagram', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ 
        status: false, 
        message: "Parameter 'username' wajib diisi." 
      });
    }

    try {
      const result = await instagramStalk(username);
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: result
      });
    } catch (err) {
      res.status(500).json({ 
        status: false, 
        error: err.message 
      });
    }
  });
};
