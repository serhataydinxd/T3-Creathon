# 7. sınıf Fen Bilimleri program modeli araştırması

Araştırma ve bağlantı erişim tarihi: **2026-09-03**.

## Sonuç

7. sınıf Fen Bilimleri için esas alınması gereken güncel program, **Türkiye Yüzyılı Maarif Modeli Fen Bilimleri Dersi Öğretim Programı (3-8)**'dır. MEB'in 2026-2027 temel eğitim planları sayfası, modelin bu öğretim yılında **1, 2, 3, 5, 6 ve 7. sınıflarda** uygulanacağını açıkça belirtir. Dolayısıyla 7. sınıf bakımından geçiş yılı 2026-2027'dir. [MEB — Temel Eğitim Taslak Çerçeve Planları](https://tymm.meb.gov.tr/taslak-cerceve-planlari/temel-egitim)

Bu sonuç ayrıca Ocak 2026 Tebliğler Dergisi'ndeki kararla desteklenir: 23.05.2024 tarihli ve 20 sayılı Kurul Kararıyla kabul edilen model kapsamında 2026-2027 için “Fen Bilimleri 7” eğitim araçlarının hazırlanması/kullanılması uygun görülmüştür. [MEB Tebliğler Dergisi, Ocak 2026](https://dhgm.meb.gov.tr/meb_iys_dosyalar/2026_01/69708cbbf3cbb635408091_Ocak-Tebligler.pdf)

Geçiş kademeli yapılmıştır. MEB'in yıl değerlendirmesi 2025-2026'da modelin 6. sınıflarda uygulanmaya başladığını belirtir; 7. sınıfın kapsama alınması bir sonraki öğretim yılı olan 2026-2027'dedir. [MEB — 2025 yılında eğitimde yeni proje ve uygulamalar](https://meb.gov.tr/2025-yilinda-egitimde-bircok-yeni-proje-ve-uygulama-hayata-gecirildi/haber/39424/tr)

## Üniteler ve kodlama şeması değişti mi?

Evet. Önceki, 2018 tarihli programda kodlar ders-sınıf-ünite-konu-kazanım biçiminde daha derin bir hiyerarşi kullanıyordu; örneğin **`F.7.7.1.1`**. 2018 belgesinde bu kodun metni “Seri ve paralel bağlı ampullerden oluşan bir devre şeması çizer.” ve üst başlığı “F.7.7. Elektrik Devreleri”dir (basılı sayfa 46). [MEB — Fen Bilimleri Dersi Öğretim Programı, 2018](https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf)

Güncel TYMM sayfalarında kayıtlar “öğrenme çıktısı” olarak ve **`FB.sınıf.ünite.çıktı`** biçiminde gösterilir. Örneğin 7. ünitenin ilk çıktısı **`FB.7.7.1`**, “Besin zincirindeki canlılar arasındaki ilişkileri yapılandırabilme”dir. [MEB — 7. sınıf, 7. ünite](https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/434)

Yalnız kod yapısı değil, ünite dizisi de değişmiştir. Güncel resmî yedi ünite şunlardır: Uzay Çağı; Kuvvet Ve Enerjiyi Keşfedelim; Vücudumuzdaki Sistemler; Işığın Kırılması Ve Mercekler; Maddenin Doğasına Yolculuk; Elektriklenme; Sürdürülebilir Yaşam Ve Enerji. [MEB — 7. sınıf Fen Bilimleri programı](https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/8)

Kod alanlarında, resmî sayfadaki çıktı metninden önce ayraç görevi gören son nokta depolanmamıştır: sayfadaki “`FB.7.7.1.` + metin” gösterimi veri içinde `FB.7.7.1` kimliği ve ayrı `canonicalText` alanı olarak tutulmuştur. Bu, kullanıcının verdiği `F.7.7.1.1` yazım biçimiyle de tutarlıdır.

## Projedeki `F.7.7.1.1` güncel mi?

Hayır. Bu kod **2018 Fen Bilimleri Dersi Öğretim Programı**na aittir. 2025-2026'da 7. sınıflar henüz kademeli geçiş kapsamında olmadığından o sınıf düzeyi için kullanılmaya devam etmiş olsa da, **2026-2027 7. sınıf korpusu için güncel değildir**. Güncel programda 7. ünite artık “Sürdürülebilir Yaşam Ve Enerji”, 6. ünite ise “Elektriklenme”dir; seri/paralel bağlı ampul kazanımının güncel programda birebir karşılığı **doğrulanamadı**. [2018 programı](https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf), [güncel 6. ünite](https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/433), [güncel 7. ünite](https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/434)

## Kaynak ve doğrulama notları

- Yedi ünitenin tamamı için resmî TYMM ünite sayfalarında kod ve çıktı metni bulundu; boş bırakılması gereken kayıt olmadı.
- En fazla dikkat gerektiren kayıtlar 6. ve 7. ünitelerdir. Bu iki resmî HTML sayfasında bazı Türkçe karakterler ayrıştırılmış Unicode biçiminde sunuluyor. JSON'da karakterler NFC'ye normalize edildi; sözcük, büyük/küçük harf veya noktalama içeriği düzeltilmedi. [6. ünite](https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/433), [7. ünite](https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/434)
- Tüm kayıtlar, görev gereği insan doğrulaması yapılana kadar `unverified` bırakıldı. Kaynağın resmî olması bu iş akışındaki insan onayı yerine geçmez.
- Eski `F.7.7.1.1` çıktısının yeni programda birebir eşdeğeri olduğuna dair resmî bir eşleştirme tablosu **doğrulanamadı**; bu nedenle otomatik eşleştirme yapılmamalıdır.
