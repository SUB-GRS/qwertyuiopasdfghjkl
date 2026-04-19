const axios = require('axios');

let sessions = {};

const gemini = {
    getNewCookie: async () => {
        try {
            const r = await axios.post(
                "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c",
                "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
                {
                    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
                }
            );
            const ck = r.headers['set-cookie'];
            if (!ck) throw new Error("UPSTREAM_COOKIE_EMPTY");
            return ck[0].split(";")[0];
        } catch (e) {
            throw new Error(e.message);
        }
    },

    ask: async (prompt, prev = null) => {
        if (!prompt?.trim()) throw new Error("PROMPT_REQUIRED");
        
        let r = null, c = null;
        if (prev) {
            try {
                let j = JSON.parse(Buffer.from(prev, 'base64').toString());
                r = j.newResumeArray;
                c = j.cookie;
            } catch (e) {
                r = null;
                c = null;
            }
        }

        const cookie = c || (await gemini.getNewCookie());
        const h = {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "x-goog-ext-525001261-jspb": '[1,null,null,null,"9ec249fc9ad08861",null,null,null,[4]]',
            "cookie": cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        };

        const b = [[prompt], ["en-US"], r];
        const a = [null, JSON.stringify(b)];
        const body = new URLSearchParams({ "f.req": JSON.stringify(a) });

        const x = await axios.post(
            "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=en-US&_reqid=2813378&rt=c",
            body.toString(),
            { headers: h }
        );

        const d = x.data;
        const matches = Array.from(d.matchAll(/^\d+\n(.+?)\n/gm));
        if (matches.length < 4) throw new Error("PARSING_FAILURE");
        
        const m = matches.reverse()[3][1];
        const p1 = JSON.parse(JSON.parse(m)[0][2]);
        
        return {
            text: p1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, "*$1*"),
            id: Buffer.from(
                JSON.stringify({
                    newResumeArray: [...p1[1], p1[4][0][0]],
                    cookie: cookie,
                })
            ).toString('base64'),
        };
    },
};

module.exports = function (app) {
    app.get('/ai/gemini', async (req, res) => {
        const { text, session, userId } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: "Parameter 'text' wajib diisi."
            });
        }

        try {
            const cache = userId && sessions[userId];
            const prevSession = (cache && cache.expire > Date.now()) ? cache.id : session;

            const result = await gemini.ask(text, prevSession);

            if (userId) {
                sessions[userId] = { id: result.id, expire: Date.now() + 86400000 };
            }

            res.json({
                status: true,
                result: {
                    response: result.text,
                    session: result.id
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message || "Terjadi kesalahan pada layanan Gemini"
            });
        }
    });
};
