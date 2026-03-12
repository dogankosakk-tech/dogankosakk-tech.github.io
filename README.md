# CASAGAZ TECH

E-ticaret ve yapay zeka destekli dijital çözümler tanıtım sitesi.

## Özellikler

- **Tasarım:** Siyah tonlar, neon vurgular (sarı, yeşil, mavi)
- **3D animasyonlar:** Hero bölümünde Three.js ile dönen geometrik şekiller
- **Hizmetler:** Shopify mağaza kurulumu, AI ürün fotoğrafı, AI ürün videoları
- **Paketler:** Website (Shopify) ve Fotoğraf/Video ayrı sekmeler; her pakette **Fiyat oluştur** ile tahmini fiyat hesaplama
- **İletişim:** Form gönderilince mesaj WhatsApp (+90 537 879 20 22) üzerinden açılır
- **Yapılan İşler:** `/portfolio` sayfasında portfolio; `/admin` üzerinden ekleme/düzenleme/silme ve görsel yükleme

## Çalıştırma

**Backend ile (portfolio + admin için gerekli):**

```bash
npm install
npm start
```

Tarayıcıda: **http://localhost:3333**

- Ana sayfa: `/`
- Yapılan işler: http://localhost:3333/portfolio
- Yönetim paneli (yapılan iş ekle/düzenle/sil): http://localhost:3333/admin

**Sadece statik site:** `npx serve .` veya `python3 -m http.server 8000` — bu durumda portfolio, admin ve chatbot API’si çalışmaz.

---

## Dil (TR / EN)

Site Türkçe ve İngilizce destekler. Sağ üstte **TR / EN** ile dil değiştirilir; tercih `localStorage`’da saklanır. Metinler `locales/tr.json` ve `locales/en.json` dosyalarındadır.

---

## Chatbot + Telegram

- Sitede sağ altta **3D stil sohbet** kutusu vardır.
- Müşteri yazdığında mesaj **Telegram’a** gider (sizin belirttiğiniz chat ID’ye).
- Siz Telegram’da bota gelen mesaja **yanıt (reply)** verirseniz, bu yanıt müşterinin chatbot ekranında anında görünür.
- İsteğe bağlı: `OPENAI_API_KEY` tanımlarsanız, müşteri mesajına önce kısa bir **yapay zeka yanıtı** gider; siz yine Telegram’dan cevap yazabilirsiniz.

**Kurulum:**

1. `.env.example` dosyasını `.env` olarak kopyalayın.
2. Telegram’da [@BotFather](https://t.me/BotFather) ile yeni bot oluşturup **token** alın.
3. Botunuza bir mesaj atın (ör. “Merhaba”), sonra tarayıcıda açın:  
   `https://api.telegram.org/bot<TOKEN>/getUpdates`  
   `result[0].message.chat.id` değeri **TELEGRAM_CHAT_ID**’dir.
4. `.env` içine yazın:  
   `TELEGRAM_BOT_TOKEN=...`  
   `TELEGRAM_CHAT_ID=...`
5. Sunucuyu yeniden başlatın (`npm start`). Projede `dotenv` kullanıldığı için `.env` dosyası otomatik okunur.
