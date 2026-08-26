# İMKÂN

**Onaylı bir kazanımı, okulun gerçek imkânlarına uyarlanmış, pedagog onaylı ve
sınıfta basılıp uygulanabilir bir atölye paketine dönüştüren yapay zekâ
asistanı.**

> Kazanım sabit kalır; atölye, okulun imkânlarına göre yeniden tasarlanır.

🔗 **Canlı demo:** https://d1a8sno49hnlhc.cloudfront.net

T3 Vakfı Bursiyer Yapay Zekâ Creathonu 2026 · **Problem 3 — Bilim Türkiye AI
Eğitim İçeriği Geliştirme Asistanı**

![İMKÂN onaylı atölye paketi](docs/images/paket.png)

*Elektriği ve interneti olmayan bir sınıf için yapay zekâ tarafından yazılmış,
pedagog onaylı ve yayımlanmış atölye paketi. Kazanım kilitli, malzeme listesi ve
maliyet kod tarafından hesaplanmış.*

---

## Hangi problemi çözüyor?

Bir fen öğretmeni, tek bir kazanım için atölye planı hazırlarken şunları
tek tek düşünmek zorundadır: 40 dakikaya sığacak mı, 30 öğrenci kaç gruba
bölünecek, okulda priz var mı, internet çekiyor mu, deney seti bütçeye
sığıyor mu, görme güçlüğü olan öğrenci için alternatif ne olacak?

Hazır plan bankaları bu soruları cevaplamaz. Genel amaçlı bir sohbet robotu
ise elinizde olmayan malzemeyi ister, süreyi tutturmaz ve kazanımı sessizce
değiştirir. Ortaya çıkan planın pedagojik olarak onaylandığına dair hiçbir iz
kalmaz.

**İMKÂN tam bu boşluğu doldurur:** kazanımı kilitler, okulun imkânlarını girdi
olarak alır ve aynı kazanıma ulaşan farklı bir yol üretir.

## Neyi kolaylaştırıyor?

| Önce | İMKÂN ile |
|---|---|
| Plan hazırlamak saatler sürer | Koşulları seçip saniyeler içinde paket üretilir |
| Elinizde olmayan malzeme önerilir | Yalnızca işaretlediğiniz malzemeler kullanılır |
| Bütçe sonradan fark edilir | Maliyet hesaplanır, bütçeyi aşarsa üretim durdurulur |
| Süre tahminidir | Aşama süreleri istenen süreye birebir bölünür |
| Elektrik/internet yoksa plan çöker | Onaylı, çevrimdışı alternatife otomatik geçilir |
| "Bunu kim onayladı?" belirsizdir | Her sürümün pedagog onayı ve karar geçmişi kayıtlıdır |
| Alışveriş listesi elle çıkarılır | Grup başına ve sınıf toplamı malzeme listesi hazır gelir |

### Somut örnek

Elektriği ve interneti olmayan, yalnızca kâğıt-kalem-makas-bandı bulunan bir
sınıf, 30 öğrenci, 40 dakika ve 50 ₺ bütçe girildiğinde İMKÂN devre setini
**kâğıt tabanlı insan-devresi modeliyle** değiştirir, aynı kazanımı korur ve
14 ₺ maliyetli, 6 gruba bölünmüş, yazdırılabilir bir paket üretir.

Aynı sınıfa devre seti eklendiğinde ise fiziksel kurulum rotası seçilir; maliyet
186 ₺'ye çıktığı için 50 ₺'lik kesin bütçe sınırı üretimi **bilinçli olarak
durdurur**. Kazanım her iki senaryoda da aynıdır.

## Yapay zekâ nerede devreye giriyor?

Atölyenin **metnini** bir dil modeli yazar: aşama başlıkları, öğretmen ve
öğrenci yönergeleri, öğrenme kanıtı ve kazanım bağlantısı.

Modelin **dokunamadığı** şeyler kod tarafından yeniden hesaplanır:

- 5E aşamalarının sayısı ve sırası
- Aşama sürelerinin dağılımı ve toplamı
- Grup sayısı, malzeme miktarları ve maliyet
- Bütçe, güvenlik ve kapasite kontrolleri
- Kilitli kazanım metni

Taslak kaydedilirken sunucu iskeleti sıfırdan yeniden üretir ve yalnızca
incelenen metni üzerine yerleştirir. Bu nedenle model, elinizde olmayan bir
malzemeyi veya bütçeyi aşan bir kurulumu kayda geçiremez.

Sağlayıcı yavaşlarsa, boş yanıt dönerse veya sözleşmeyi bozarsa sistem
**doğrulanmış çevrimdışı plana düşer** ve bunu bir uyarı olarak bildirir.
Üretim her koşulda kullanılabilir bir atölye döndürür.

## Rol akışı

```
İçerik uzmanı        Pedagog                 Yönetici        Eğitimci
─────────────        ───────                 ────────        ────────
koşulları girer  →   kazanım bağlantısını
paketi üretir        ve kanıtları inceler →  yayımlar    →   uygular
taslağı gönderir     onaylar / revizyon                      yazdırır
                     ister                                   geri bildirim
                                                             bırakır
```

Kendi paketini onaylamak engellidir. Değişiklik istenen sürüm dondurulur, yeni
sürüm oluşturulur ve eski sürüm "eski sürüm" olarak kayıtta kalır. Eğitimci geri
bildirimi yöneticinin yeniden kullanım özetine düşer.

## Şu an çalışan kısım

Uçtan uca çalışan, herkese açık bir dikey dilim:

- Kaynak profili formu: süre, sınıf/grup mevcudu, bütçe, elektrik, internet,
  malzeme ve erişilebilirlik
- Dil modeliyle canlı üretim (`APP_MODE=live`) ve deterministik yedek
- Aynı kazanım için iki gerçek rota: fiziksel devre veya onaylı kâğıt model
- Grup başına ve sınıf toplamı malzeme listesi, maliyet ve envanter durumu
- Kazanım–kanıt izlenebilirliği olan beş aşamalı 5E planı
- Taslak → inceleme → onay → yayım → geri bildirim iş akışı
- Değişmez sürüm geçmişi ve denetlenebilir durum geçişleri
- Puan dağılımıyla sınıf geri bildirimi ve yöneticiye yeniden kullanım özeti
- Yazdırılabilir eğitimci paketi (öğretmen/öğrenci yönergeleri, malzeme tablosu)
- Onay bekleyen kayıt akışı ve yönetici tarafından rol atama
- Argon2id şifreleme, iptal edilebilir sunucu tabanlı oturumlar
- HTTPS yayın, gerçek tarayıcı testleri ve erişilebilirlik denetimi

**Dürüst kapsam sınırı:** şu an tek bir onaylı kazanım (F.7.7.1.1, seri ve
paralel devre şeması) ve tek pedagoji modeli (5E) tanımlıdır. Mimari çoklu
kazanımı destekler; referans veri kümesi genişletilmeyi bekliyor.

## Hızlı başlangıç

Gereksinim: Node.js 24+

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000` adresini açın ve **Atölye laboratuvarı**'na girin.
Varsayılan profil ana demo senaryosunu kurar: 30 öğrenci, 40 dakika, elektrik
ve internet yok, yalnızca sınıf kırtasiyesi.

Yerel hesaplar (`DEMO_PASSWORD` verilmezse şifre `I.mkanDemo!2026`):

| Hesap | Rol |
|---|---|
| `content@imkan.test` | İçerik uzmanı |
| `pedagogue@imkan.test` | Pedagog |
| `educator@imkan.test` | Eğitimci |
| `manager@imkan.test` | Yönetici |

Herkese açık kayıtla oluşturulan hesaplar, bir yönetici etkinleştirene kadar
onay bekler; rol ve oturum almaz.

### Canlı üretimi açmak

```bash
cp .env.example .env
# DEEPSEEK_API_KEY değerini girin
APP_MODE=live npm run dev
```

`APP_MODE` `live` değilse veya anahtar yoksa sistem deterministik modda kalır.

### Doğrulama

```bash
npm run check      # lint + 59 birim testi + üretim derlemesi
npm run check:all  # yukarısı + 11 tarayıcı testi
```

Tarayıcı testleri Docker gerektirmez: gömülü PGlite üzerinde aynı PostgreSQL
göçlerini çalıştırır ve ağ çağrısı yapmaz.

## Teknoloji

Next.js 16 · TypeScript · PostgreSQL + Drizzle · Argon2id · Zod · Playwright +
axe · Docker · AWS ECS Fargate + RDS + CloudFront · GitHub Actions OIDC

## Belgeler

| Belge | İçerik |
|---|---|
| [Ürün özeti](docs/01-product-brief.md) | Problem, kullanıcılar, kapsam |
| [Gereksinim izlenebilirliği](docs/02-requirements-traceability.md) | Creathon şartlarıyla eşleme |
| [Teknik mimari](docs/03-technical-architecture.md) | Bileşenler ve veri akışı |
| [Yapay zekâ üretimi ve doğrulama](docs/04-ai-generation-validation.md) | Sağlayıcı sözleşmesi, güvenceler |
| [Veri, API ve güvenlik](docs/05-data-api-security.md) | Şema, uç noktalar, tehdit modeli |
| [Derleme, test ve demo](docs/06-build-test-demo.md) | Doğrulama planı |
| [Yayın](docs/07-deployment.md) | AWS topolojisi |
| [Üretim el kitabı](docs/09-production-runbook.md) | İşletme adımları |

## Güvenlik ve gizlilik notu

Herkese açık demoya gerçek öğrenci verisi, kişisel veri veya gerçek şifre
girmeyin. Kenar (CloudFront) ile uygulama arasındaki iç bağlantı, alan adı
alınana kadar HTTP'dir; yük dengeleyici yalnızca CloudFront kaynak aralıklarını
kabul eder. `.env*` dosyaları Git ve Docker derleme bağlamı dışındadır.

Creathon problem kitapçığı izlenebilirlik için yerelde tutulur; yeniden dağıtım
izni doğrulanana kadar herkese açık depoya eklenmemiştir.
