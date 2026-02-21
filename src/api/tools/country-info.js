const axios = require('axios');

// Cache internal untuk efisiensi
let countryDataCache = null;
let coordsDataCache = null;

/**
 * Logika perhitungan kemiripan teks (Fuzzy Matching)
 */
function calculateSimilarity(str1, str2) {
  str1 = str1.toLowerCase().replace(/\s+/g, '');
  str2 = str2.toLowerCase().replace(/\s+/g, '');
  if (str1 === str2) return 1;
  const maxLen = Math.max(str1.length, str2.length);
  if (str2.includes(str1) || str1.includes(str2)) return 0.9;
  
  let matches = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) matches++;
  }
  const prefixMatch = (str1.startsWith(str2.slice(0, 3)) || str2.startsWith(str1.slice(0, 3))) ? 0.2 : 0;
  return (matches / maxLen) + prefixMatch;
}

/**
 * Fetch data dari GitHub repository source
 */
async function loadCountryDatabase() {
  if (countryDataCache && coordsDataCache) return { countries: countryDataCache, coords: coordsDataCache };

  try {
    const [coordsRes, countriesRes] = await Promise.all([
      axios.get('https://raw.githubusercontent.com/CoderPopCat/Country-Searcher/refs/heads/master/src/constants/country-coords.json'),
      axios.get('https://raw.githubusercontent.com/CoderPopCat/Country-Searcher/refs/heads/master/src/constants/countries.json')
    ]);

    coordsDataCache = coordsRes.data;
    countryDataCache = countriesRes.data;
    return { countries: countryDataCache, coords: coordsDataCache };
  } catch (error) {
    throw new Error("Gagal mengunduh database negara: " + error.message);
  }
}

module.exports = function (app) {
  /**
   * @endpoint /tools/country-info
   * Deskripsi: Mencari informasi lengkap suatu negara berdasarkan nama.
   */
  app.get('/tools/country-info', async (req, res) => {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ status: false, message: "Parameter 'name' wajib diisi." });
    }

    try {
      const { countries, coords } = await loadCountryDatabase();
      const searchName = name.toLowerCase().trim();

      const similarityResults = countries
        .map((c) => ({ country: c, similarity: calculateSimilarity(searchName, c.country) }))
        .sort((a, b) => b.similarity - a.similarity);

      const best = similarityResults[0];

      if (!best || best.similarity < 0.4) {
        return res.status(404).json({
          status: false,
          message: 'Negara tidak ditemukan.',
          suggestions: similarityResults.slice(0, 5).map((r) => r.country.country)
        });
      }

      const country = best.country;
      const coord = coords.find((c) => c.name.toLowerCase() === country.country.toLowerCase());

      const continents = {
        as: { name: 'Asia', emoji: '🌏' },
        eu: { name: 'Europe', emoji: '🌍' },
        af: { name: 'Africa', emoji: '🌍' },
        na: { name: 'North America', emoji: '🌎' },
        sa: { name: 'South America', emoji: '🌎' },
        oc: { name: 'Oceania', emoji: '🌏' },
        an: { name: 'Antarctica', emoji: '🌎' },
      };

      const result = {
        metadata: {
          matched_as: country.country,
          confidence: (best.similarity * 100).toFixed(2) + "%"
        },
        data: {
          name: country.country,
          capital: country.capital,
          flag: country.flag,
          phone_code: country.phone_code,
          continent: continents[country.continent] || { name: 'Unknown', emoji: '🌐' },
          coordinates: { 
            lat: coord?.latitude || null, 
            lng: coord?.longitude || null 
          },
          area: { km2: country.area.km2, miles2: country.area.mi2 },
          is_landlocked: country.is_landlocked,
          languages: country.language_codes,
          famous_for: country.famous_for,
          constitutional_form: country.constitutional_form,
          currency: country.currency,
          driving_side: country.drive_direction,
          iso_code: country.iso
        }
      };

      res.status(200).json({
        status: true,
        creator: "dyzen - GooTa API",
        data: result
      });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};
