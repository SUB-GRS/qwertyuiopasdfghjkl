const axios = require('axios');

/**
 * Fungsi Scraper NPM Stalk
 * Mengambil metadata langsung dari NPM Registry
 */
async function npmstalk(packageName) {
  try {
    let stalk = await axios.get("https://registry.npmjs.org/" + packageName);
    let versions = stalk.data.versions;
    let allver = Object.keys(versions);
    let verLatest = allver[allver.length - 1];
    let verPublish = allver[0];
    let packageLatest = versions[verLatest];
    
    return {
      name: packageName,
      version_latest: verLatest,
      version_publish: verPublish,
      total_versions: allver.length,
      latest_dependencies: packageLatest.dependencies ? Object.keys(packageLatest.dependencies).length : 0,
      publish_dependencies: versions[verPublish].dependencies ? Object.keys(versions[verPublish].dependencies).length : 0,
      publish_time: stalk.data.time.created,
      latest_publish_time: stalk.data.time[verLatest],
      license: stalk.data.license || 'N/A',
      author: stalk.data.author?.name || 'N/A',
      repository: stalk.data.repository?.url || 'N/A'
    };
  } catch (err) {
    throw new Error('Package tidak ditemukan atau terjadi kesalahan server.');
  }
}

// Controller Express
module.exports = function (app) {
  app.get('/tools/npm-stalk', async (req, res) => {
    const { package } = req.query;

    if (!package) {
      return res.status(400).json({ 
        status: false, 
        message: 'Masukkan parameter package, bro. Contoh: /tools/npm-stalk?package=axios' 
      });
    }

    try {
      const result = await npmstalk(package);
      res.status(200).json({
        status: true,
        creator: "GooTa API",
        result: result
      });
    } catch (error) {
      res.status(404).json({ 
        status: false, 
        message: error.message 
      });
    }
  });
};
