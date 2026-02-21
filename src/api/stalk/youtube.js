const axios = require('axios');
const cheerio = require('cheerio');

/**
 * YouTube Channel Stalker Core Logic
 * Mengekstrak metadata channel dan video terbaru dari script ytInitialData
 */
async function youtubeStalk(username) {
  try {
    const config = {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      timeout: 15000
    };

    // Bersihkan username dari karakter @ jika ada
    const cleanUser = username.replace('@', '');
    const { data: html } = await axios.get(`https://www.youtube.com/@${cleanUser}`, config);
    const $ = cheerio.load(html);

    // Cari script yang mengandung data awal YouTube
    const scriptTag = $('script').filter((_, el) => {
      const content = $(el).html();
      return content && content.includes('var ytInitialData =');
    }).html();

    if (!scriptTag) throw new Error("Gagal menemukan script data YouTube.");

    const jsonString = scriptTag.match(/var ytInitialData = (.*?);/)?.[1];
    if (!jsonString) throw new Error("Gagal mengekstrak JSON data.");

    const parsedData = JSON.parse(jsonString);

    // 1. Ekstraksi Metadata Channel
    const channelMetadata = {
      username: `@${cleanUser}`,
      name: null,
      subscriberCount: "0",
      videoCount: "0",
      avatarUrl: null,
      description: null,
      is_verified: false
    };

    const header = parsedData.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
    if (header) {
      channelMetadata.name = header.title?.content || "N/A";
      channelMetadata.avatarUrl = header.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url;
      
      const metaRows = header.metadata?.contentMetadataViewModel?.metadataRows || [];
      metaRows.forEach(row => {
        row.metadataParts?.forEach(part => {
          const text = part.text?.content || "";
          if (text.includes("subscriber")) channelMetadata.subscriberCount = text;
          if (text.includes("video")) channelMetadata.videoCount = text;
        });
      });
      
      channelMetadata.is_verified = !!header.title?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl;
    }

    // 2. Ekstraksi Video Terbaru (Limit 5)
    const latestVideos = [];
    const contents = parsedData.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    
    // Traversal untuk mencari GridVideo atau VideoRenderer
    for (const section of contents) {
      const items = section.itemSectionRenderer?.contents?.[0]?.shelfRenderer?.content?.horizontalListRenderer?.items || [];
      for (const item of items) {
        if (latestVideos.length >= 5) break;
        const v = item.gridVideoRenderer || item.videoRenderer;
        if (v) {
          latestVideos.push({
            videoId: v.videoId,
            title: v.title?.runs?.[0]?.text || v.title?.simpleText,
            thumbnail: v.thumbnail?.thumbnails?.pop()?.url,
            publishedTime: v.publishedTimeText?.simpleText,
            viewCount: v.viewCountText?.simpleText,
            duration: v.thumbnailOverlays?.find(o => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "N/A",
            url: `https://www.youtube.com/watch?v=${v.videoId}`
          });
        }
      }
    }

    return { channel: channelMetadata, latest_videos: latestVideos };
  } catch (error) {
    throw new Error(`YouTube Stalk Error: ${error.message}`);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/yt-stalk
   * Deskripsi: Mengambil informasi profil channel YouTube dan video terbarunya.
   */
  app.get('/stalk/youtube', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ status: false, message: "Parameter 'username' wajib diisi." });
    }

    try {
      const data = await youtubeStalk(username);
      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: data
      });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};
