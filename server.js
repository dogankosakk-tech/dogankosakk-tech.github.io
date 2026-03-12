import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3333;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DATA_DIR = path.join(__dirname, 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'portfolio');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Chat: sessionId -> Set of WebSocket; telegram message_id -> sessionId (for replies)
const sessionClients = new Map();
const telegramMessageToSession = new Map();
// Birden fazla müşteri: her yeni oturuma sırayla etiket (Müşteri 1, 2, 3...)
let sessionCounter = 0;
const sessionLabels = new Map();
function getSessionLabel(sessionId) {
  if (!sessionLabels.has(sessionId)) {
    sessionCounter += 1;
    sessionLabels.set(sessionId, 'Müşteri ' + sessionCounter);
  }
  return sessionLabels.get(sessionId);
}

function getPortfolio() {
  try {
    if (!fs.existsSync(PORTFOLIO_FILE)) return [];
    const data = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getPortfolio:', e.message);
    return [];
  }
}

function savePortfolio(items) {
  if (!Array.isArray(items)) throw new Error('Portfolio must be an array');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function getOrders() {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname) || '.jpg'),
});
/* Yüksek çözünürlüklü video ve fotoğraf için dosya başına 200 MB */
const PORTFOLIO_FILE_SIZE_LIMIT = 200 * 1024 * 1024;
const upload = multer({ storage, limits: { fileSize: PORTFOLIO_FILE_SIZE_LIMIT } });
const uploadPortfolio = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'media', maxCount: 20 }]);

function getMediaUrlsFromReq(req) {
  const urls = [];
  try {
    if (req.files && req.files.media && Array.isArray(req.files.media)) {
      req.files.media.forEach((f) => { if (f && f.filename) urls.push('/portfolio/' + f.filename); });
    }
    if (req.files && req.files.image && Array.isArray(req.files.image) && req.files.image[0] && req.files.image[0].filename) {
      urls.unshift('/portfolio/' + req.files.image[0].filename);
    }
  } catch (e) {
    console.error('getMediaUrlsFromReq:', e.message);
  }
  return urls;
}

app.use(cors());
app.use(express.json());

// ---------- API routes (static'ten önce; 404 önlemek için) ----------
app.get('/api/health', (req, res) => res.json({ ok: true, server: 'casagaz' }));

// Telegram: metin gönder (sipariş bildirimi vb.)
function sendTelegramText(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return Promise.resolve();
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}&text=${encodeURIComponent(text)}`;
  return fetch(url).catch(() => {});
}

app.get('/api/orders', (req, res) => {
  try {
    const orders = getOrders();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const body = req.body || {};
    const packageType = (body.packageType || 'photo').toString();
    const options = typeof body.options === 'string' ? body.options : JSON.stringify(body.options || {});
    const total = (body.total || 0).toString().replace(/\D/g, '') || '0';
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const phone = (body.phone || '').toString().trim();
    const message = (body.message || '').toString().trim();

    const orders = getOrders();
    const id = uuidv4();
    const order = {
      id,
      packageType,
      options,
      total: total,
      name,
      email,
      phone,
      message,
      status: 'yeni',
      createdAt: new Date().toISOString(),
    };
    orders.unshift(order);
    saveOrders(orders);

    const telegramLines = [
      '🛒 Yeni sipariş geldi!',
      `Paket: ${packageType === 'website' ? 'Shopify Mağaza' : 'Fotoğraf & Video'}`,
      `Toplam: ₺${Number(total).toLocaleString('tr-TR')}`,
      `Müşteri: ${name || '-'}`,
      `E-posta: ${email || '-'}`,
      `Tel: ${phone || '-'}`,
    ];
    if (message) telegramLines.push(`Not: ${message.slice(0, 200)}`);
    sendTelegramText(telegramLines.join('\n'));

    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    const allowed = ['status'];
    allowed.forEach((key) => {
      if (body[key] !== undefined) orders[idx][key] = String(body[key]).trim() || orders[idx][key];
    });
    saveOrders(orders);
    res.json(orders[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA sayfa route'ları static'ten önce (TR: kök, EN: /en/ prefix)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/portfolio', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/portfolio/website', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/portfolio/photo', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/en', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/en/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/en/portfolio', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/en/portfolio/website', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/en/portfolio/photo', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/en/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/en/admin/', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/paketler/website', (req, res) => res.sendFile(path.join(__dirname, 'package-website.html')));
app.get('/paketler/foto-video', (req, res) => res.sendFile(path.join(__dirname, 'package-photo.html')));
app.get('/en/paketler/website', (req, res) => res.sendFile(path.join(__dirname, 'package-website.html')));
app.get('/en/paketler/foto-video', (req, res) => res.sendFile(path.join(__dirname, 'package-photo.html')));

app.use(express.static(path.join(__dirname)));
app.use('/portfolio', express.static(UPLOAD_DIR));

// ---------- Chat API ----------
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'sessionId and message required' });
  }
  const text = message.trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: 'Empty message' });

  let autoReply = null;
  if (OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Sen CASAGAZ TECH şirketinin yardımcı asistanısın. E-ticaret, Shopify mağaza kurulumu, AI ürün fotoğrafı ve video hizmetleri sunuyorsun. Kısa, dostça ve profesyonel yanıt ver. Müşteri sorusuna göre dilde (Türkçe/İngilizce) yanıtla.',
            },
            { role: 'user', content: text },
          ],
          max_tokens: 150,
        }),
      });
      const data = await r.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        autoReply = data.choices[0].message.content.trim();
      }
    } catch (e) {
      console.error('OpenAI:', e.message);
    }
  }

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const label = getSessionLabel(sessionId);
      const telegramText =
        `📩 ${label}\n` +
        `Session: ${sessionId}\n\n` +
        `Müşteri: ${text}\n\n` +
        `———\nBu mesaja YANIT (reply) yazın; yanıtınız bu müşteriye iletilecek.`;
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}&text=${encodeURIComponent(telegramText)}`;
      const tgRes = await fetch(url);
      const tgData = await tgRes.json();
      if (tgData.ok && tgData.result && tgData.result.message_id) {
        telegramMessageToSession.set(tgData.result.message_id, sessionId);
      }
    } catch (e) {
      console.error('Telegram send:', e.message);
    }
  }

  res.json({ ok: true, autoReply: autoReply || undefined });
});

// API: get portfolio
app.get('/api/portfolio', (req, res) => {
  try {
    const items = getPortfolio();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: add portfolio item (image veya çoklu media)
app.post('/api/portfolio', uploadPortfolio, (req, res) => {
  try {
    const items = getPortfolio();
    const id = uuidv4();
    const mediaUrls = getMediaUrlsFromReq(req);
    const body = req.body || {};
    const imageUrl = mediaUrls[0] || body.imageUrl || '';
    const item = {
      id,
      title: (body.title != null && body.title !== undefined) ? String(body.title) : '',
      description: (body.description != null && body.description !== undefined) ? String(body.description) : '',
      category: (body.category != null && body.category !== undefined) ? String(body.category) : 'website',
      imageUrl,
      mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      link: (body.link != null && body.link !== undefined) ? String(body.link) : '',
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    savePortfolio(items);
    res.status(201).json(item);
  } catch (e) {
    console.error('POST /api/portfolio:', e.message);
    console.error(e.stack);
    res.status(500).json({ error: e.message || 'Kaydedilemedi.' });
  }
});

// API: update portfolio item
app.put('/api/portfolio/:id', uploadPortfolio, (req, res) => {
  try {
    const items = getPortfolio();
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const body = req.body || {};
    const newUrls = getMediaUrlsFromReq(req);
    const imageUrl = newUrls.length ? newUrls[0] : (body.imageUrl !== undefined ? body.imageUrl : items[idx].imageUrl);
    const mediaUrls = newUrls.length ? newUrls : items[idx].mediaUrls;
    items[idx] = {
      ...items[idx],
      title: body.title !== undefined ? String(body.title) : items[idx].title,
      description: body.description !== undefined ? String(body.description) : items[idx].description,
      category: body.category !== undefined ? String(body.category) : items[idx].category,
      imageUrl,
      mediaUrls: mediaUrls || items[idx].mediaUrls,
      link: body.link !== undefined ? String(body.link) : items[idx].link,
      updatedAt: new Date().toISOString(),
    };
    savePortfolio(items);
    res.json(items[idx]);
  } catch (e) {
    console.error('PUT /api/portfolio:', e.message);
    console.error(e.stack);
    res.status(500).json({ error: e.message || 'Kaydedilemedi.' });
  }
});

// Multer / upload hataları: dosya boyutu aşımı → 413, diğer → 500
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Dosya boyutu çok büyük. Maksimum 200 MB/dosya.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: err.message || 'Beklenmeyen dosya alanı.' });
  }
  console.error('Upload/route error:', err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

// API: delete portfolio item (tüm medya dosyalarını sil)
app.delete('/api/portfolio/:id', (req, res) => {
  try {
    let items = getPortfolio();
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const urls = item.mediaUrls && item.mediaUrls.length ? item.mediaUrls : (item.imageUrl ? [item.imageUrl] : []);
    urls.forEach((url) => {
      const filePath = path.join(__dirname, 'public', url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    items = items.filter((i) => i.id !== req.params.id);
    savePortfolio(items);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: website screenshot for portfolio preview (Microlink fullPage / PageShot + Microlink fallback)
async function fetchScreenshotPageShot(url, signal) {
  const shotUrl = 'https://pageshot.site/v1/screenshot?url=' + encodeURIComponent(url);
  const shotRes = await fetch(shotUrl, { redirect: 'follow', signal });
  if (!shotRes.ok) return null;
  const contentType = (shotRes.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^image\//i.test(contentType)) return null;
  const buf = await shotRes.arrayBuffer();
  return { buffer: Buffer.from(buf), contentType: contentType || 'image/png' };
}

async function fetchScreenshotMicrolink(url, fullPage, signal) {
  const microlinkUrl =
    'https://api.microlink.io/?url=' +
    encodeURIComponent(url) +
    '&screenshot=true' +
    (fullPage ? '&screenshot.fullPage=true' : '');
  const mlRes = await fetch(microlinkUrl, { signal });
  const mlJson = await mlRes.json();
  const screenshotUrl = mlJson?.data?.screenshot?.url;
  if (!screenshotUrl) return null;
  const imgRes = await fetch(screenshotUrl, { signal });
  if (!imgRes.ok) return null;
  const contentType = (imgRes.headers.get('content-type') || 'image/png').split(';')[0].trim();
  const buf = await imgRes.arrayBuffer();
  return { buffer: Buffer.from(buf), contentType: /^image\//i.test(contentType) ? contentType : 'image/png' };
}

app.get('/api/preview-screenshot', async (req, res) => {
  const rawUrl = (req.query.url || '').toString().trim();
  const fullPage = req.query.fullPage === '1' || req.query.fullPage === 'true';
  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http/https URLs allowed' });
  }
  const timeoutMs = fullPage ? 45000 : 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let result = null;
    if (fullPage) {
      try {
        result = await fetchScreenshotMicrolink(targetUrl.href, true, controller.signal);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Preview screenshot (Microlink fullPage):', e.message, targetUrl.href);
      }
    }
    if (!result) {
      try {
        result = await fetchScreenshotPageShot(targetUrl.href, controller.signal);
      } catch (e) {
        if (e.name === 'AbortError') console.error('Preview screenshot: PageShot timeout', targetUrl.href);
        else console.error('Preview screenshot: PageShot', e.message, targetUrl.href);
      }
    }
    if (!result) {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
        result = await fetchScreenshotMicrolink(targetUrl.href, false, controller2.signal);
        clearTimeout(timeoutId2);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Preview screenshot: Microlink', e.message, targetUrl.href);
      }
    }
    clearTimeout(timeoutId);
    if (!result) {
      return res.status(502).json({ error: 'Screenshot failed' });
    }
    res.setHeader('content-type', result.contentType);
    res.setHeader('cache-control', 'private, max-age=0');
    res.send(result.buffer);
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e.name === 'AbortError' ? 'Screenshot timeout' : e.message;
    console.error('Preview screenshot:', msg, targetUrl.href);
    res.status(502).json({ error: 'Screenshot failed' });
  }
});

const server = http.createServer(app);

// WebSocket for chat replies
const wss = new WebSocketServer({ server, path: '/chat' });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'register' && data.sessionId) {
        const sid = data.sessionId;
        if (!sessionClients.has(sid)) sessionClients.set(sid, new Set());
        sessionClients.get(sid).add(ws);
        ws._sessionId = sid;
        const pending = pendingRepliesBySession.get(sid);
        if (pending && pending.length > 0) {
          pending.forEach((p) => { if (ws.readyState === 1) ws.send(p); });
          pendingRepliesBySession.delete(sid);
        }
        ws.on('close', () => {
          if (ws._sessionId && sessionClients.get(ws._sessionId)) {
            sessionClients.get(ws._sessionId).delete(ws);
            if (sessionClients.get(ws._sessionId).size === 0) sessionClients.delete(ws._sessionId);
          }
        });
      }
    } catch (e) {}
  });
});

// Müşteri sayfayı kapatmışsa yanıtlar bekletilir; tekrar bağlanınca gönderilir
const pendingRepliesBySession = new Map();
const MAX_PENDING = 20;

function pushReplyToSession(sessionId, text) {
  const payload = JSON.stringify({ type: 'reply', text });
  const clients = sessionClients.get(sessionId);
  if (clients && clients.size > 0) {
    clients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(payload);
    });
    return;
  }
  const pending = pendingRepliesBySession.get(sessionId) || [];
  if (pending.length < MAX_PENDING) pending.push(payload);
  pendingRepliesBySession.set(sessionId, pending);
}

// Telegram getUpdates polling (receive your replies and push to chatbot)
let telegramOffset = 0;
const DEBUG_TELEGRAM = process.env.DEBUG_TELEGRAM === '1';

function parseSessionIdFromReplyText(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/Session:\s*([^\s\n\r]+)/);
  return m ? m[1].trim() : null;
}

async function pollTelegram() {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${telegramOffset}&timeout=25`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.ok) {
      if (DEBUG_TELEGRAM && data.description) console.log('[Telegram] getUpdates error:', data.description);
      setTimeout(pollTelegram, 5000);
      return;
    }
    if (!data.result || !data.result.length) {
      setTimeout(pollTelegram, 500);
      return;
    }
    for (const update of data.result) {
      telegramOffset = update.update_id + 1;
      const msg = update.message;
      if (!msg || !msg.text) continue;
      const chatId = msg.chat && String(msg.chat.id);
      if (TELEGRAM_CHAT_ID && chatId !== String(TELEGRAM_CHAT_ID)) continue;
      const replyTo = msg.reply_to_message;
      if (!replyTo) continue;
      const repliedId = replyTo.message_id;
      let sessionId = telegramMessageToSession.get(repliedId);
      if (!sessionId && replyTo.text) sessionId = parseSessionIdFromReplyText(replyTo.text);
      if (DEBUG_TELEGRAM) {
        console.log('[Telegram] Reply received, repliedId=', repliedId, 'sessionId=', sessionId, 'clients=', sessionId ? sessionClients.get(sessionId)?.size : 0);
      }
      if (sessionId) {
        pushReplyToSession(sessionId, msg.text);
        telegramMessageToSession.delete(repliedId);
      }
    }
  } catch (e) {
    console.error('Telegram poll:', e.message);
  }
  setTimeout(pollTelegram, 500);
}
if (TELEGRAM_BOT_TOKEN) setTimeout(pollTelegram, 2000);

server.listen(PORT, () => {
  console.log('CASAGAZ TECH → http://localhost:' + PORT);
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Chatbot: Telegram ayarlanmadı. TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID verin.');
  } else {
    console.log('Chatbot: Mesajlar Telegram\'a gönderilecek; yanıtlar sohbet kutusuna düşecek.');
  }
});
