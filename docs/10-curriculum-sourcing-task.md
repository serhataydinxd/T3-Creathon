# Görev: 7. sınıf Fen Bilimleri onaylı kazanım korpusu (araştırma + veri)

İMKÂN'ı tek senaryodan 7. sınıf fen bilimleri içerik sistemine çıkarıyoruz.
Bu görev **yalnızca veri ve kaynak araştırmasıdır**. Hiçbir mevcut dosya
değiştirilmeyecek, kod yazılmayacak, build/test çalıştırılmayacak.

Yalnızca YENİ dosyalar oluştur, `content/` dizini altında.

## Neden bu iş kritik

Kazanım kodları ve resmî metinleri yapay zekâ tarafından ÜRETİLEMEZ. Yanlış
kod, bir fen öğretmeni jüri üyesi tarafından anında görülür ve tüm projenin
güvenilirliğini düşürür. Bu yüzden her kayıt doğrulanabilir bir kaynağa
bağlanmalı.

## Deliverable 1 — `content/outcomes-grade7.json`

7. sınıf fen bilimleri ünitelerinin her birinden BİR kazanım, bu şemaya uygun:

```json
{
  "outcomes": [
    {
      "code": "",
      "canonicalText": "",
      "gradeLevel": 7,
      "unit": "",
      "unitOrder": 1,
      "source": {
        "document": "",
        "url": "",
        "accessedOn": "YYYY-MM-DD",
        "reference": ""
      },
      "verification": "unverified",
      "notes": ""
    }
  ]
}
```

Alan açıklamaları:

| Alan | Kural |
|---|---|
| `code` | resmî kazanım kodu, birebir |
| `canonicalText` | resmî kazanım metni, birebir, düzeltilmemiş |
| `unit` | resmî ünite adı |
| `unitOrder` | 1..7 |
| `source.document` | resmî doküman adı ve yılı |
| `source.url` | doğrulanabilir bağlantı |
| `source.accessedOn` | erişim tarihi |
| `source.reference` | sayfa / bölüm |
| `verification` | `unverified` bırak; insan doğrulayınca `verified` olur |

Üniteler: (1) Güneş Sistemi ve Ötesi, (2) Hücre ve Bölünmeler, (3) Kuvvet ve
Enerji, (4) Saf Madde ve Karışımlar, (5) Işığın Madde ile Etkileşimi,
(6) Üreme, Büyüme ve Gelişme, (7) Elektrik Devreleri.
Resmî ünite adları farklıysa **resmî olanı yaz**, yukarıdakini değil.

**En önemli kural:** bir kodu veya metni doğrulanabilir bir kaynaktan teyit
edemiyorsan `code` ve `canonicalText` alanlarını BOŞ bırak, `verification`
`unverified` kalsın ve `notes` alanına neyi bulamadığını yaz. Tahmin etme,
benzetme yapma, hatırladığını yazma. **Eksik kayıt, yanlış kayıttan iyidir.**

## Deliverable 2 — `content/curriculum-model-report.md`

Kısa bir rapor:

- Şu anda yürürlükte olan program hangisi? (Türkiye Yüzyılı Maarif Modeli mi,
  önceki Fen Bilimleri Öğretim Programı mı?) Hangi öğretim yılından itibaren?
- Kazanım kodlama şeması iki model arasında değişti mi? Örnek ver.
- Projede şu an kullanılan `F.7.7.1.1` kodu hangi modele ait ve güncel mi?
- Hangi ünite/kazanım için kaynak bulmakta zorlandın?
- Her iddia için bağlantı ver. Emin olmadığın yeri açıkça "doğrulanamadı" yaz.

## Deliverable 3 — `content/materials-research.md`

Atölye malzemeleri için Türkiye perakende fiyat araştırması. Her malzeme için:

| Alan | Açıklama |
|---|---|
| `key` | kısa İngilizce anahtar (örn. `magnifier`) |
| `label` | Türkçe ad |
| `category` | kırtasiye / elektrik / optik / laboratuvar / sunum |
| `kind` | `consumable` (tükenir) veya `reusable` (tekrar kullanılır) |
| `unitCostTry` | birim fiyat, TL |
| `priceSource` | fiyatı aldığın bağlantı |
| `pricedOn` | fiyatın alındığı tarih (YYYY-MM-DD) |
| `commonlyAvailable` | tipik bir Türk sınıfında bulunur mu (true/false) |

20–25 malzeme yeterli; yedi ünitede paylaşılabilecek olanları tercih et.
Fiyat bulamadığın malzemeyi listele ama fiyatı boş bırak.

## Yapmayacakların

- Mevcut hiçbir dosyayı düzenlemeyeceksin (`server/`, `app/`, `components/`,
  `tests/`, `docs/`, `README.md` dâhil).
- Kod yazmayacak, migration üretmeyecek, `npm` komutu çalıştırmayacaksın.
- Commit atma; dosyaları bırak, entegrasyonu ben yapacağım.
- Kazanım kodu veya resmî metin uydurma. Bu tek kural diğer hepsinden önemli.
