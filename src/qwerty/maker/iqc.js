const { generateIQC } = require("iqc-canvas");

module.exports = function (app) {

  app.get("/maker/iqc", async (req, res) => {

    try {

      const { teks } = req.query;

      if (!teks || typeof teks !== "string" || !teks.trim()) {

        return res.json({

          status: false,

          creator: "Z8",

          error: "Parameter 'teks' wajib diisi"

        });

      }

      const finalTime = new Intl.DateTimeFormat("en-GB", {

        hour: "2-digit",

        minute: "2-digit",

        hour12: false,

        timeZone: "Asia/Jakarta"

      }).format(new Date());

      const randomBattery = Math.floor(Math.random() * 101).toString();

      const result = await generateIQC(teks, finalTime, {

        baterai: [true, randomBattery],

        operator: true,

        timebar: true,

        wifi: true

      });

      res.writeHead(200, {

        "Content-Type": "image/png",

        "Content-Length": result.image.length,

        "Cache-Control": "public, max-age=86400"

      });

      res.end(result.image);

    } catch (err) {

      res.status(500).json({

        status: false,

        creator: "Z8",

        error: err.message

      });

    }

  });

};