const axios = require('axios');

// Fungsi Logic (Bisa ditaruh di folder /lib)
function getGitHubZipUrl(url) {
    const regex = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/i;
    const match = url.match(regex);
    if (!match) return null;

    const user = match[1];
    let repo = match[2].replace(/\.git$/, '');
    
    return {
        url: `https://api.github.com/repos/${user}/${repo}/zipball`,
        fileName: `${repo}.zip`
    };
}

// Module Export
module.exports = function (app) {
    app.get('/download/gitclone', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'Parameter url GitHub diperlukan.' 
            });
        }

        const gitInfo = getGitHubZipUrl(url);
        if (!gitInfo) {
            return res.status(400).json({ 
                status: false, 
                message: 'URL GitHub tidak valid.' 
            });
        }

        try {
            // Kita arahkan browser untuk langsung download file dari GitHub
            res.status(200).json({
                status: true,
                creator: "GooTa API",
                result: {
                    name: gitInfo.fileName,
                    url: gitInfo.url
                }
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: 'Gagal memproses gitclone.' 
            });
        }
    });
};
