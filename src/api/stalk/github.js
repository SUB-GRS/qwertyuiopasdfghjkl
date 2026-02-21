const axios = require('axios');

/**
 * Scraper function untuk GitHub Stalk
 * Mengambil data profil publik dari GitHub API
 */
async function githubStalk(user) {
  try {
    const { data } = await axios.get(`https://api.github.com/users/${user}`, {
        headers: {
            'User-Agent': 'GooTa-API/1.0'
        }
    });
    
    return {
      username: data.login || null,
      nickname: data.name || null,
      bio: data.bio || null,
      id: data.id || null,
      nodeId: data.node_id || null,
      profile_pic: data.avatar_url || null,
      url: data.html_url || null,
      type: data.type || null,
      admin: data.site_admin || false,
      company: data.company || null,
      blog: data.blog || null,
      location: data.location || null,
      email: data.email || null,
      public_repo: data.public_repos || 0,
      public_gists: data.public_gists || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      created_at: data.created_at || null,
      updated_at: data.updated_at || null,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
        throw new Error("User GitHub tidak ditemukan.");
    }
    throw new Error("Gagal mengambil data GitHub: " + error.message);
  }
}

module.exports = function(app) {
    /**
     * @endpoint /tools/github-stalk
     * Deskripsi: Mendapatkan informasi detail profil GitHub seseorang
     */
    app.get('/stalk/github', async (req, res) => {
        const user = req.query.user?.trim();
        const startTime = Date.now();

        if (!user) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'user' (username GitHub) wajib diisi."
            });
        }

        try {
            const result = await githubStalk(user);
            
            res.status(200).json({
                status: true,
                creator: "dyzen - GooTa API",
                data: result,
                response_time: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    });
};
