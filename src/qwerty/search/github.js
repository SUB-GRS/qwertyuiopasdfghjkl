const axios = require('axios');

// Fungsi Helper Format Tanggal
function formatDate(n, locale = 'id') {
    let d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
}

module.exports = function (app) {
    app.get('/search/github', async (req, res) => {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ 
                status: false, 
                message: 'Masukkan parameter query untuk mencari repo, bro.' 
            });
        }

        try {
            const response = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0' // GitHub API wajib pakai User-Agent
                }
            });

            const items = response.data.items;

            if (!items || items.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: 'Repository tidak ditemukan.'
                });
            }

            // Mapping data agar lebih bersih
            const result = items.map(repo => ({
                full_name: repo.full_name,
                url: repo.html_url,
                is_fork: repo.fork,
                created_at: formatDate(repo.created_at),
                updated_at: formatDate(repo.updated_at),
                stats: {
                    watchers: repo.watchers,
                    forks: repo.forks,
                    stars: repo.stargazers_count,
                    issues: repo.open_issues
                },
                description: repo.description || 'Tidak ada deskripsi',
                clone_url: repo.clone_url
            }));

            res.status(200).json({
                status: true,
                creator: "GooTa API",
                total_results: response.data.total_count,
                result: result
            });

        } catch (error) {
            res.status(error.response?.status || 500).json({
                status: false,
                error: error.response?.data?.message || error.message
            });
        }
    });
};
