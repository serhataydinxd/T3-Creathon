# İMKÂN — Sonraki Ürün Aşaması Uygulama Promptu

Aşağıdaki metni İMKÂN deposunu ve mevcut kod tabanını tanıyan bir geliştirme ajanına doğrudan ver.

---

İMKÂN'ın mevcut çalışan dikey dilimini, aşağıdaki hedef doğrultusunda üretim kalitesinde genişlet:

**Tasarla → Uygula → Raporla → Paylaş → Başka merkeze uyarla**

Bu bir yeniden yazım veya sıfırdan proje kurma görevi değildir. Mevcut mimariyi, doğrulama kurallarını, kullanıcı değişikliklerini ve çalışan özellikleri koru. Önce çalışma ağacının güncel durumunu incele; ilgisiz değişiklikleri geri alma. `AGENTS.md` talimatlarına uy.

## 1. Mevcut durumu doğru kabul et

Depodaki güncel kod gerçeğin kaynağıdır. Aşağıdaki başlangıç durumunu doğrula ve bunun üzerine çalış:

- Next.js/TypeScript modüler monolit, PostgreSQL/Drizzle, Zod ve veritabanı tabanlı oturumlar kullanılıyor.
- Üretim, inceleme, onay, yayım, değişmez sürüm geçmişi ve eğitmen geri bildirimi çalışıyor.
- Bilim Türkiye kataloğu 7 atölye teması × 3 yaş grubu içinde 183 yayımlanmış konu barındırıyor.
- Bunların yalnızca 6 tanesi İMKÂN'da hazırlanmış içerikle eşleşiyor; tümü 12–14 yaş grubunda ve iki temada. Bir hazırlanmış konu katalog dışı.
- Hazırlanmamış katalog konuları yalnızca **TASLAK ÖNERİ** üretebilir; onaylı içerik gibi sunulamaz.
- 30 Bilim Türkiye merkezi ve dört eğitim formatı statik referans verisi olarak modellenmiş durumda.
- Merkez özelliklerinde `available/unpublished` ayrımı var; fakat çalışma profili ve rota değerlendirmesi henüz gerçek üç durumlu modeli uçtan uca korumuyor.
- Uzun süreli eğitim seçilebilir, ancak mevcut plan yalnızca paketin tek 60 dakikalık oturumunu kapsıyor.
- Bilim Türkiye konuları ve MEB öğrenme çıktıları kavramsal olarak ayrıştırılmış olsa da katalog konuları veritabanında hâlâ genel `objectives` tablosuna sentetik `BT.*` kodlarıyla yazılıyor.
- Etkinlik uygulama kaydı, uygulama raporu, etkinlik kütüphanesi ve merkezler arası uyarlama henüz yok.
- Kullanıcı rolü kodda geriye uyumluluk için `educator`, arayüz dilinde **Eğitmen** olarak kalabilir.

Bu maddelerden biri kodla uyuşmuyorsa kodu ve testleri esas al, farkı belgele ve güvenli bir karar ver. Eski dokümanlardaki elle yazılmış sayaçları veya kapsam iddialarını gerçek kabul etme.

## 2. Ana hedef ve öncelik sırası

Çalışmayı aşağıdaki sırayla tamamla. Bir aşamanın veri modeli, yetki kuralları ve testleri sağlam değilse sonraki aşamaya geçme.

1. Temel veri ayrımlarını ve üç durumlu merkez yeterliliklerini düzelt.
2. Yayımlanmış atölyeden uygulama kaydı ve doğrulanabilir rapor üret.
3. Onaylı ve paylaşılabilir raporları Etkinlik Kütüphanesi'nde yayımla.
4. Kütüphanedeki bir etkinliği başka merkeze kaynak ilişkisini koruyarak uyarla.
5. Uçtan uca demo, erişilebilirlik, güvenlik, dokümantasyon ve üretim kontrollerini tamamla.

Her aşamada mümkün olan en küçük çalışan dikey dilimi oluştur. Büyük, birbirinden kopuk iskelet tablolar veya yalnızca görsel prototipler bırakma.

## 3. Değişmez ürün kuralları

### 3.1 Bilim Türkiye konusu ile MEB çıktısını ayır

- Bilim Türkiye **atölye teması**, **konu/içerik başlığı** ve **yaş grubu** ürünün temel kimliğidir.
- MEB kazanımı/öğrenme çıktısı opsiyonel bir eşlemedir; konu kimliği değildir.
- Kaynaklı ve uzman onaylı eşleme yoksa arayüz açıkça şunu söylemelidir: **Bu konu için doğrulanmış kazanım eşlemesi bulunmuyor.**
- Yapay zekâ resmî kazanım kodu veya metni üretemez, düzeltemez ya da sessizce değiştiremez.
- Mevcut doğrulanmamış MEB kayıtları “doğrulanmış/onaylı” gösterilemez.
- Sentetik `BT.*` teknik kodlarını kullanıcıya MEB kodu gibi gösterme.

Mevcut `objectives` yabancı anahtarlarını kırmadan, tercihen eklemeli bir migration ile konu ve kazanım türlerini açıkça ayır. Ayrı `topics`/`topic_outcome_mappings` tabloları veya eşdeğer, açıkça gerekçelendirilmiş bir model kullanabilirsin. Eski atölye sürümleri okunmaya devam etmelidir.

### 3.2 Taslak ile onaylı içeriği ayır

- Resmî katalogda bir konu adının bulunması, o konu için hazırlanmış ve pedagojik olarak onaylanmış bir atölye olduğu anlamına gelmez.
- Hazırlanmamış konudan üretilen genel iskelet her ekranda ve çıktıda **TASLAK ÖNERİ** olarak görünmelidir.
- Taslak öneri “doğrudan uygulanabilir”, “doğrulandı” veya “onaylı rota” şeklinde sunulamaz.
- Bir taslak ancak mevcut inceleme → onay → yayım akışından geçtikten sonra hazırlanmış içerik kapsamına dâhil olur.
- Kapsam sayaçları her zaman kayıtlardan hesaplanmalı; elle yazılmamalıdır.

### 3.3 Bilinmeyen donanımı yok sayma

Merkez yeterliliği ve envanteri uçtan uca şu üç durumdan birini taşımalıdır:

- `available`: mevcut ve doğrulanmış
- `unavailable`: mevcut olmadığı doğrulanmış
- `unknown`: bilinmiyor, yayımlanmamış veya henüz doğrulanmamış

Gerekli bir özellik için:

- `available` → koşul karşılanır.
- `unavailable` → rota uygulanamaz.
- `unknown` → rota **bilgi eksikliği nedeniyle belirsiz** olur; yok kabul edilmez.

Merkez seçimi yalnızca doğrulanmış özellikleri otomatik doldurmalı ve bilinmeyenleri ayrıca göstermelidir. Eğitmen, yetkisi dâhilinde durumu doğrulayabilmeli; kaynak, doğrulayan kişi ve tarih kaydedilmelidir.

### 3.4 Deterministik kod ile yapay zekâyı ayır

Kod şunların tek otoritesidir:

- süre toplamı ve zaman dağılımı
- katılımcı, grup sayısı ve kapasite
- malzeme miktarı
- edinme, tekrar kullanım ve sarf maliyeti
- kesin bütçe sınırı
- yaş, format, donanım ve güvenlik uygunluğu
- erişim yetkisi
- sürüm ve durum geçişleri
- kaynak sürümün değişmezliği
- paylaşım ve kişisel veri kuralları

Yapay zekâ yalnızca:

- uygun seçenekleri açıklayabilir,
- yaşa uygun eğitmen/öğrenci yönergeleri yazabilir,
- yapılandırılmış aşama metni ve öğrenme kanıtı önerebilir,
- kullanıcının kaydettiği gerçeklerden rapor anlatısı oluşturabilir,
- kodun bulduğu uyum sorunlarını anlaşılır dille açıklayabilir.

AI çıktısı sürümlenmiş Zod şemasıyla doğrulanmalı; geçersiz çıktı güvenli biçimde reddedilmeli veya mevcut deterministik yedeğe düşmelidir. Model hiçbir deterministik değeri değiştirememelidir.

## 4. Aşama 1 — Temel veri ve öneri sistemi

### 4.1 Merkez ve envanter modeli

Statik `server/content/venues.ts` referansını kaynak veri olarak koru; fakat kullanıcı tarafından doğrulanabilen operasyonel merkez verisini veritabanında modelle.

En az şu kavramları kapsa:

- merkez
- merkez yeterliliği
- merkez envanter kalemi
- durum: available/unavailable/unknown
- miktar ve birim
- kaynak URL'si veya kullanıcı doğrulaması
- doğrulayan kullanıcı
- son doğrulama tarihi
- not

Bir merkezin kamuya açık kaynakta yayımlanmayan özelliğini migration/seed sırasında `unavailable` yapma. Statik araştırma verisi başlangıçta `available` veya `unknown` olmalıdır.

### 4.2 Üretim sihirbazı

Mevcut Atölye Laboratuvarı'nı bozma; kademeli ve anlaşılır bir sihirbaza dönüştür. En az şu bilgileri topla:

- merkez veya merkez dışı uygulama
- atölye teması
- katalog konusu
- yaş grubu
- opsiyonel, doğrulanmış MEB eşlemesi
- eğitim formatı
- süre
- katılımcı ve grup büyüklüğü
- internet ve elektrik
- merkez yeterlilikleri
- mevcut sarf ve tekrar kullanılabilir malzemeler ile miktarları
- bütçe ve kesin bütçe seçeneği
- erişilebilirlik ve güvenlik gereksinimleri
- hazırlık süresi ve beklenen öğrenme kanıtı

Mevcut, eski profiller okunabilsin. Yeni alanlar için güvenli varsayılanlar ve geriye uyumlu ayrıştırma kullan.

### 4.3 Birden çok açıklanabilir öneri

Mevcut tek “en zengin rota” seçimini geliştirerek uygun olduğunda en fazla üç aday göster:

- Doğrudan uygulanabilir
- Küçük uyarlamayla uygulanabilir
- Uygulanamaz
- Bilgi eksikliği nedeniyle belirsiz

Her adayda şunlar bulunsun:

- rota ve konu
- yaş/format/süre uyumu
- uygunluk durumu ve kodla hesaplanan gerekçeler
- toplam ve edinme maliyeti
- eksik malzemeler
- bilinmeyen merkez özellikleri
- güvenlik uyarıları
- kullanılabilen, önceden tanımlı alternatif

Uygunluk puanı kullanılacaksa bileşenleri görünür ve deterministik olmalıdır. Yapay zekâ tek başına puan veremez.

Hazırlanmamış katalog konusunun genel taslağı en fazla “taslak içerik geliştirme adayı” olabilir; araştırılmamış etkinlik gereksinimlerini güvenli veya uygulanabilir sayma.

## 5. Aşama 2 — Uygulama kaydı ve raporlama

Yalnızca **yayımlanmış** bir atölye sürümünden uygulama başlatılabilsin. Atölye sayfasına **Uygulama raporu oluştur** eylemi ekle.

### 5.1 Değişmez plan anlık görüntüsü

Uygulama kaydı başladığında yayımlanmış sürümden aşağıdakileri değişmez anlık görüntü olarak sakla:

- kaynak atölye ve sürüm kimliği
- konu, tema, yaş grubu ve format
- opsiyonel doğrulanmış kazanım eşlemesi
- planlanan süre, katılımcı, grup sayısı ve bütçe
- planlanan aşamalar ve malzemeler
- kaynak merkez gereksinimleri

Sonradan kaynak sürüm değişse bile eski uygulama raporu aynı planı göstermelidir.

### 5.2 Gerçekleşen uygulama verisi

Eğitmenin toplu olarak gireceği bilgiler:

- merkez, tarih ve saat
- gerçek katılımcı ve grup sayısı
- gerçekleşen süre
- uygulanan, değiştirilen veya atlanan aşamalar ve nedenleri
- kullanılan gerçek malzeme/miktarlar ve alternatifler
- gerçek maliyet
- gözlenen öğrenme kanıtları
- en iyi çalışan ve zorlanılan bölümler
- erişilebilirlik uygulamaları
- güvenlik gözlemi ve olay bilgisi
- bir sonraki uygulama önerileri
- paylaşım görünürlüğü

Planlanan ve gerçekleşen değerleri aynı alanda ezme. Yan yana karşılaştırılabilir ayrı alanlar kullan.

Varsayılan olarak çocuk adı, kimliği, iletişim bilgisi, bireysel sağlık/başarı verisi veya fotoğraf toplama. Bu aşamada dosya/medya yükleme ekleme; mevcut mimaride nesne depolama ve moderasyon yoktur. Bunun yerine gelecekteki ekler için sınırı dokümante et.

### 5.3 AI rapor taslağı

AI yalnızca uygulama kaydındaki gerçeklerden anlatı üretmelidir:

- Eksik sayı veya maliyet uydurma.
- Uygulanmayan aşamayı yapılmış gösterme.
- Kanıt yokken öğrenmenin gerçekleştiğini kesinleştirme.
- Olay veya aksaklığı gizleme.
- Eksik alanı “Belirtilmedi” veya “Doğrulanmadı” olarak bırak.

AI raporu daima taslaktır. Eğitmen düzenleyebilir ve incelemeye gönderebilir. Kendi raporunu pedagojik olarak onaylayamaz.

Rapor yaşam döngüsü:

**Taslak → İncelemeye gönderildi → Değişiklik istendi → Onaylandı → Kütüphanede yayımlandı**

Durum geçişleri ve rapor sürümleri denetlenebilir olmalı. Onaylanmış bir raporu yerinde değiştirme; yeni sürüm oluştur.

### 5.4 Rapor çıktısı

HTML yazdırma/PDF görünümü şu bölümleri kapsasın:

- kimlik ve kaynak sürüm
- yönetici özeti
- merkez ve toplu katılımcı profili
- konu ve varsa doğrulanmış kazanım
- planlanan–gerçekleşen karşılaştırması
- uygulama süreci ve değişiklikler
- gerçek malzeme ve maliyet
- öğrenme kanıtları ve eğitmen gözlemleri
- erişilebilirlik ve güvenlik
- sonraki uygulama önerileri
- hazırlayan, inceleyen, onaylayan ve zaman damgaları

## 6. Aşama 3 — Etkinlik Kütüphanesi

Yalnızca aşağıdaki koşulları sağlayan içerik kütüphaneye girebilir:

- kaynak atölye yayımlanmış,
- uygulama raporu onaylanmış,
- paylaşım izni verilmiş,
- genel görünüm kişisel/hassas veriden arındırılmış.

Kütüphane kartlarında en az şunları göster:

- etkinlik ve konu adı
- atölye teması ve yaş grubu
- uygulayan merkez/şehir
- tarih, süre ve toplu katılımcı sayısı
- temel malzemeler ve gerçek bütçe
- eğitmen puanı
- uyarlanma sayısı
- uygulanabilirlik etiketi

Arama/filtreleme:

- serbest metin
- merkez ve şehir/ülke
- tema, konu, yaş grubu ve format
- süre ve bütçe aralığı
- katılımcı sayısı
- internet/elektrik/donanım gereksinimi
- erişilebilirlik özellikleri
- tarih, puan, en yeni, en çok kullanılan/uyarlanan, düşük maliyet

Sunucu tarafı filtreleme ve sayfalama kullan. Yetkisiz veya yayımlanmamış kayıtların kimliklerini dahi sızdırma. Boş, yükleniyor, hata ve yetkisiz durumlarını tasarla.

## 7. Aşama 4 — Merkezime uyarla

Kütüphanedeki bir etkinlikten **Merkezime uyarla** eylemi yeni ve bağımsız bir taslak oluşturmalıdır. Kaynak atölye, rapor veya sürüm hiçbir koşulda değişmemelidir.

Köken bilgileri:

- kaynak atölye sürümü
- kaynak uygulama raporu
- kaynak ve hedef merkez
- uyarlayan kullanıcı ve tarih
- değiştirilen alanlar ve gerekçeleri
- korunan konu ve varsa doğrulanmış kazanım
- yeni taslak/sürüm kimliği

Kaynak gereksinimlerle hedef merkezi deterministik olarak karşılaştır:

- karşılanan koşullar
- doğrulanmış eksikler
- bilinmeyen özellikler
- malzeme miktarı ve kapasite farkı
- yeni grup sayısı
- yeni maliyet ve bütçe
- süre/format farkı
- erişilebilirlik ve güvenlik engelleri
- önceden onaylı alternatif rotalar

Sonuçlardan biri:

- Tam uyumlu
- Uyarlanabilir
- Uyumsuz
- Merkez bilgileri eksik

Konu değişiyorsa bu aynı atölyenin uyarlaması değildir; köken notu taşıyabilen yeni bir atölye taslağıdır. Kazanım değişikliği de açık yetki ve yeniden inceleme gerektirir.

## 8. Roller ve yetkiler

Mevcut rolleri koru ve sunucu tarafında uygula:

### İçerik uzmanı

- Atölye/taslak oluşturur ve düzenler.
- Katalog konusu seçer, kaynak ekler ve incelemeye gönderir.

### Pedagog

- Yaşa uygunluğu, konu/kazanım bağını ve kanıtları inceler.
- Değişiklik ister veya yetkisi dâhilinde onaylar.
- Kendi oluşturduğu içeriği tek başına onaylayamaz.

### Eğitmen (`educator`)

- Yayımlanmış atölyeyi uygular.
- Uygulama kaydı ve AI rapor taslağı oluşturur.
- Kütüphaneden içerik seçip merkezine uyarlama taslağı başlatır.
- Geri bildirim verir.

### Yönetici

- Kullanıcı, merkez ve doğrulama yetkilerini yönetir.
- Yayım ve kütüphane görünürlüğünü yönetir.
- Toplu kullanım/uyarlama istatistiklerini görür.
- Hassas güvenlik kayıtlarına yalnız yetkisi kapsamında erişir.

Her mutasyon için yalnız arayüz gizlemesine değil, sunucu tarafı yetki denetimine güven.

## 9. Veri modeli ve migration ilkeleri

Mevcut tabloları silme. Eklemeli ve geriye uyumlu migration kullan. Kesin adlar mimariye göre değişebilir ancak şu kavramlar kalıcı ve sorgulanabilir olmalıdır:

- topics ve opsiyonel topic–outcome mappings
- centres, centre capabilities, centre inventory
- delivery records ve değişmez plan snapshot
- delivery materials/observations
- report versions ve transitions
- library entries/visibility
- adaptation records ve compatibility findings

Her AI üretiminde model, mod, şema sürümü, güvenli istek özeti/hash'i, zaman, doğrulama bulguları ve kullanıcı değişiklikleri denetlenebilir biçimde saklanmalıdır.

Migration ve seed işlemleri idempotent olmalı. `db:release` yeni referans kayıtlarını üretimde de senkronize etmeli. Eski paketler, eski profiller ve var olan demo hesapları çalışmaya devam etmelidir.

## 10. Güvenlik ve gizlilik

- Çocuklara ait kişisel veri toplama; tüm katılım ve öğrenme verileri toplu olsun.
- Güvenlik olayı ve özel gereksinim notlarını genel kütüphane belgesine otomatik aktarma.
- Serbest metinleri güvenilmeyen veri kabul et; prompt injection içeriğini sistem talimatı olarak modele taşıma.
- AI bağlamına yalnız gereken ve kullanıcının erişebildiği kayıtları koy.
- Genel kütüphane sorgularında taslak, özel ve hassas kayıtları filtrele.
- Durum geçişlerinde yarış koşulu ve çift gönderimi transaction/idempotency ile önle.
- Yeni uç noktaları CSRF/same-origin, rate limit, oturum ve rol testlerine dâhil et.
- Günlüklere parola, oturum belirteci, çocuk verisi veya tam hassas serbest metin yazma.

## 11. Arayüz

Mevcut görsel dili ve Türkçe Bilim Türkiye terminolojisini koru. Ana navigasyonu mevcut yetkilere göre şu hedef yapıya genişlet:

- Genel Bakış
- Atölye Üret
- Atölyelerim
- Etkinlik Raporları
- Etkinlik Kütüphanesi
- Onay Bekleyenler
- Merkez ve Envanter
- Yönetim

Tüm yeni ekranlarda:

- klavye erişimi ve görünür odak
- doğru başlık/etiket/ARIA ilişkileri
- yeterli kontrast
- mobil ve masaüstü uyumu
- boş, yükleniyor, hata, yetkisiz ve bilgi eksikliği durumları
- yazdırmada anlamlı sayfa kırımları

bulunsun. İstatistiklerde çocuk bazlı veri gösterme.

## 12. Gerçekçi final demo

Demo, mevcut hazırlanmış içerik kapsamından başlamalıdır:

1. İçerik uzmanı veya mevcut yayımlanmış paket üzerinden **12–14 yaş**, **Astronomi, Havacılık ve Uzay Atölyesi**, katalog konusu **Uzay Teknolojileri** / hazırlanmış içerik **Uzay Gözlem Araçları: Kendi Modelini Kur** seçilir.
2. Bilim Trabzon'un planetaryum özelliği doğrulanmış olduğundan planetaryum rotasının neden uygun olduğu gösterilir.
3. Paket mevcut inceleme/yayım akışından geçirilir veya yayımlanmış demo sürümü kullanılır.
4. Eğitmen uygulama başlatır; örneğin planlanan 24 katılımcıya karşı 21 gerçek katılımcı, gerçek süre ve malzeme kullanımı girer.
5. AI yalnızca bu girdilerden rapor taslağı üretir.
6. Eğitmen raporu gönderir; farklı yetkili pedagog inceler, yönetici yayımlar.
7. Rapor Etkinlik Kütüphanesi'nde görünür.
8. Başka bir merkezde planetaryum durumu `unknown` ise sistem bunu yok saymaz ve “Merkez bilgileri eksik” gösterir.
9. Eğitmen planetaryumun olmadığını doğrularsa sistem aynı konudaki hazırlanmış sınıf/modelleme rotasını önerir.
10. Uyarlama, kaynak kökenini koruyan bağımsız taslak olur; kaynak sürüm değişmez.

Hazırlanmamış 9–11 yaş astronomi konusu bu ana demoda kullanma; aksi hâlde ürün onaylı içerik yerine genel taslak öneri gösterir. Taslak öneri akışını ayrıca dürüst bir ikincil demo olarak gösterebilirsin.

## 13. Test ve kabul kriterleri

Mevcut testlerin tamamını koru. Yeni davranışları birim, entegrasyon ve Playwright testleriyle doğrula:

- 183 katalog girdisi ve kapsam sayaçları değişmeden doğru hesaplanıyor.
- Hazırlanmamış konu her yerde taslak olarak etiketleniyor.
- Bilim Türkiye konusu ile MEB eşlemesi birbirine dönüşmüyor.
- Doğrulanmamış kazanım resmî/onaylı gösterilmiyor.
- `unknown` merkez yeterliliği `unavailable` sayılmıyor.
- Bilinmeyen zorunlu donanım belirsiz; doğrulanmış eksik donanım uygulanamaz sonucu veriyor.
- Format, yaş, süre, kapasite, malzeme ve kesin bütçe kuralları deterministik.
- AI süre, grup, maliyet, konu veya kaynak kazanımı değiştiremiyor.
- Yalnız yayımlanmış sürümden uygulama başlatılıyor.
- Plan anlık görüntüsü kaynak değişse bile değişmiyor.
- Planlanan ve gerçekleşen alanlar ayrılıyor.
- AI girilmemiş uygulama bilgisini uyduramıyor.
- Eğitmen kendi raporunu pedagojik olarak onaylayamıyor.
- Taslak/özel/hassas rapor kütüphaneye veya yetkisiz kullanıcıya sızmıyor.
- Merkezime uyarla kaynak sürümü değiştirmiyor ve kökeni koruyor.
- Konu değişikliği yeni taslak olarak ele alınıyor.
- Çift gönderim aynı uygulama/uyarlamayı iki kez oluşturmuyor.
- Yeni formlar klavye ve ekran okuyucuyla kullanılabiliyor.
- Mobil, yazdırma ve hata durumları çalışıyor.

Her aşama sonunda ilgili testleri çalıştır. Finalde en az:

```bash
npm run check
npm run check:all
```

çalıştır; ortam kaynaklı çalışmayan kontrolleri açıkça ayır. Test sayısını dokümana elle sabitleme; komut çıktısını raporla.

## 14. Kapsam dışı

Bu görevde şunları ekleme:

- çocuk profilleri veya bireysel öğrenci analitiği
- fotoğraf/video/dosya yükleme
- sosyal akış, yorum duvarı veya gerçek zamanlı sohbet
- otomatik MEB kazanımı üretimi/eşlemesi
- vektör veritabanı veya gereksiz RAG altyapısı
- ikinci yapay zekâ “hakem” modeli
- Redis veya mikroservis ayrıştırması
- ödeme sistemi
- mobil uygulama

Ürün gereksinimi bu sınırlardan birini gerçekten gerektirirse uygulamayı genişletmeden önce gerekçeyi ve güvenlik/işletim maliyetini raporla.

## 15. Çalışma ve teslim biçimi

- Önce kısa bir boşluk analizi ve uygulanabilir sıra çıkar; sonra uygulamaya geç.
- Gereksiz bağımlılık veya kapsamlı refactor yapma.
- Migration, domain kuralı, sunucu yetkisi ve arayüzü aynı dikey dilimde tamamla.
- Var olan kullanıcı değişikliklerini, dağıtım yapılandırmasını ve demo hesaplarını koru.
- Güncel olmayan dokümanları davranış değişikliğiyle birlikte düzelt.
- Kaynak veriyi yalnız resmî Bilim Türkiye/T3 veya mevcut `content/` araştırmalarına dayandır; yeni dış iddiaları URL, erişim tarihi ve doğrulama durumuyla kaydet.
- Geçici çözüm veya bilinen risk bırakırsan gizleme.
- Commit veya dış sisteme gönderim yapma; kullanıcı açıkça istemedikçe yalnız çalışma ağacında bırak.

Son yanıtta şunları ver:

1. Uygulanan dikey dilimler
2. Veri modeli ve migration özeti
3. Bilim Türkiye konusu–MEB eşlemesi ayrımı
4. AI–deterministik kod görev ayrımı
5. Yetki, gizlilik ve güvenlik önlemleri
6. Test komutları ve sonuçları
7. Bilinen sınırlamalar
8. Final demo adımları
9. Değiştirilen dosyalar

Başarı ölçütü çok sayıda ekran veya tablo oluşturmak değildir. Başarı; hazırlanmış bir atölyenin gerçek uygulamaya, doğrulanabilir rapora, güvenli paylaşıma ve kaynak sürümü bozmayan merkez uyarlamasına uçtan uca dönüşmesidir.
