const express = require("express");
const chalk = require("chalk");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const rateLimit = require("express-rate-limit"); 
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// ========== TELEGRAM CONFIG ==========
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7806501736:AAGHNcf50xbRUvFDH4rvXjLWPHwzFG0YA1I";
const OWNER_ID = process.env.TELEGRAM_OWNER_ID || "7925179886";

async function sendTelegram(text) {
    if (!BOT_TOKEN || !OWNER_ID) return;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: OWNER_ID,
            text: text,
            parse_mode: "HTML"
        });
    } catch (err) {
        console.error(chalk.red(`[TelegramError] ${err.response?.data?.description || err.message}`));
    }
}

async function sendNotification(msg) {
    const text = `<b>🚀 SYSTEM NOTIFICATION</b>\n\n${msg}\n\n📅 <code>${new Date().toLocaleString()}</code>`;
    await sendTelegram(text);
}

async function sendLog({ ip, method, endpoint, status, query, duration, reason }) {
    const icons = { request: "🟡", success: "✅", error: "❌", limit: "🚫" };
    const text = `
${icons[status] || "ℹ️"} <b>API ACTIVITY - ${status.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━
👤 <b>IP:</b> <code>${ip}</code>
📡 <b>Method:</b> <code>${method}</code>
🛤️ <b>Endpoint:</b> <code>${endpoint}</code>
⏱️ <b>Duration:</b> <code>${duration ?? "-"}ms</code>
${reason ? `⚠️ <b>Reason:</b> <code>${reason}</code>\n` : ""}⌛ <b>Time:</b> <code>${new Date().toISOString()}</code>

🛠️ <b>Query:</b>
<pre>${JSON.stringify(query || {}, null, 2)}</pre>
━━━━━━━━━━━━━━━━━━
<i>GooTa API's Log System ✨</i>`;
    await sendTelegram(text);
}

// ========== EXPRESS CONFIG ==========
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.set("json spaces", 2);

// ========== RATE LIMIT CONFIG ==========
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        sendLog({
            ip,
            method: req.method,
            endpoint: req.originalUrl,
            status: "limit",
            query: req.query,
            reason: "Rate limit exceeded"
        });
        
        res.status(429).json({
            status: false,
            message: "Terlalu banyak request. Silakan coba lagi nanti dalam 15 menit."
        });
    }
});

app.use("/api/", limiter);

const ROOT_DIR = process.cwd();

// ========== STATIC FILES ==========
app.use("/", express.static(path.join(ROOT_DIR, "api-page")));
app.use("/src", express.static(path.join(ROOT_DIR, "src")));

// ========== LOAD OPENAPI ==========
const openApiPath = path.join(ROOT_DIR, "src", "openapi.json");
let openApi = {};

try {
    if (fs.existsSync(openApiPath)) {
        openApi = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
    }
} catch (e) {
    console.warn(chalk.yellow("⚠️ openapi.json invalid."));
}

app.get("/openapi.json", (req, res) => {
    if (fs.existsSync(openApiPath)) res.sendFile(openApiPath);
    else res.status(404).json({ status: false, message: "openapi.json tidak ditemukan" });
});

function matchOpenApiPath(requestPath) {
    const paths = Object.keys(openApi.paths || {});
    for (const apiPath of paths) {
        const regex = new RegExp("^" + apiPath.replace(/{[^}]+}/g, "[^/]+") + "$");
        if (regex.test(requestPath)) return true;
    }
    return false;
}

app.use((req, res, next) => {
    const original = res.json;
    res.json = function (data) {
        if (typeof data === "object") {
            data = {
                status: data.status ?? true,
                creator: openApi.info?.author || "dyzen UI",
                ...data
            };
        }
        return original.call(this, data);
    };
    next();
});

const endpointStats = {};
app.use(async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const method = req.method;
    const endpoint = req.originalUrl.split("?")[0];
    const query = req.query;
    const start = Date.now();

    const isApiEndpoint = matchOpenApiPath(endpoint);

    next();

    res.on("finish", async () => {
        if (!isApiEndpoint || res.statusCode === 429) return;
        const duration = Date.now() - start;
        const isError = res.statusCode >= 400;
        const status = isError ? "error" : "success";

        if (!endpointStats[endpoint]) endpointStats[endpoint] = { total: 0, errors: 0, totalDuration: 0 };
        endpointStats[endpoint].total++;
        endpointStats[endpoint].totalDuration += duration;
        if (isError) endpointStats[endpoint].errors++;

        await sendLog({ ip, method, endpoint, status, query, duration });
    });
});

let totalRoutes = 0;
const apiFolder = path.join(ROOT_DIR, "src", "api");

if (fs.existsSync(apiFolder)) {
    const categories = fs.readdirSync(apiFolder);
    for (const sub of categories) {
        const subPath = path.join(apiFolder, sub);
        if (fs.statSync(subPath).isDirectory()) {
            const files = fs.readdirSync(subPath);
            for (const file of files) {
                if (file.endsWith(".js")) {
                    try {
                        const routePath = path.join(subPath, file);
                        const route = require(routePath);
                        if (typeof route === "function") {
                            route(app);
                            totalRoutes++;
                        }
                    } catch (e) {
                        console.error(`Error loading ${file}: ${e.message}`);
                    }
                }
            }
        }
    }
}

app.get("/", (req, res) => res.sendFile(path.join(ROOT_DIR, "api-page", "index.html")));
app.get("/docs", (req, res) => res.sendFile(path.join(ROOT_DIR, "api-page", "docs.html")));
app.get("/ai", (req, res) => res.sendFile(path.join(ROOT_DIR, "api-page", "ai.html")));

app.use((req, res) => res.status(404).sendFile(path.join(ROOT_DIR, "api-page", "404.html")));

app.use((err, req, res, next) => {
    console.error(err.stack);
    sendNotification(`🚨 <b>SERVER ERROR</b>\n\n<code>${err.message}</code>`);
    res.status(500).sendFile(path.join(ROOT_DIR, "api-page", "500.html"));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(chalk.bgGreen.black(`Server running on port ${PORT}`));
    });
}
