import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/server/site";

const REPOSITORY = "https://github.com/serhataydinxd/T3-Creathon";

/**
 * llms.txt: a Markdown brief for language models reading the site, following
 * the llmstxt.org convention. Generated rather than kept as a static file so
 * every link stays anchored to the deployment's own origin.
 */
function build(): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

İMKÂN, T3 Vakfı Bursiyer Yapay Zekâ Creathonu 2026 kapsamında "Problem 3 —
Bilim Türkiye AI Eğitim İçeriği Geliştirme Asistanı" için geliştirilmiştir.
Arayüz ve üretilen tüm içerik Türkçedir.

## Çözdüğü problem

Bir kazanım ülke genelinde aynıdır, ancak okulların imkânları aynı değildir.
İMKÂN; süre, sınıf mevcudu, bütçe, elektrik, internet, eldeki malzeme ve
erişilebilirlik ihtiyaçlarını girdi olarak alır ve kazanımı değiştirmeden aynı
hedefe ulaşan bir atölye paketi üretir.

## Yapay zekânın rolü ve sınırları

Bir dil modeli yalnızca atölyenin metnini yazar: aşama başlıkları, öğretmen ve
öğrenci yönergeleri, öğrenme kanıtı ve kazanım bağlantısı.

Aşağıdakiler kod tarafından deterministik olarak hesaplanır ve model bunları
değiştiremez:

- 5E aşamalarının sayısı ve sırası
- Aşama sürelerinin dağılımı ve toplamı
- Grup sayısı, malzeme miktarları ve tahmini maliyet
- Bütçe, güvenlik ve grup kapasitesi kontrolleri
- Kilitli kazanım metni

Taslak kaydedilirken sunucu bu iskeleti sıfırdan yeniden üretir ve yalnızca
incelenmiş metni üzerine yerleştirir. Sağlayıcı yavaşlar, boş yanıt döner veya
şemayı bozarsa üretim doğrulanmış çevrimdışı plana düşer ve bunu bir uyarı
olarak bildirir.

## Sayfalar

- [Ana sayfa](${absoluteUrl("/")}): ürün tanıtımı ve çalışma mantığı
- [Proje hakkında](${absoluteUrl("/about")}): kapsam, pedagojik güvenceler ve sınırlar
- [Giriş](${absoluteUrl("/login")}): rol tabanlı çalışma alanı girişi
- [Kayıt](${absoluteUrl("/register")}): yönetici onayı bekleyen hesap oluşturma

## Kaynaklar

- [Kaynak kodu](${REPOSITORY}): açık kaynak depo
- [Ürün özeti](${REPOSITORY}/blob/main/docs/01-product-brief.md)
- [Yapay zekâ üretimi ve doğrulama](${REPOSITORY}/blob/main/docs/04-ai-generation-validation.md)
- [Veri, API ve güvenlik](${REPOSITORY}/blob/main/docs/05-data-api-security.md)

## Notlar

- Uygulamanın atölye üretimi, inceleme ve yayım akışı oturum açmayı gerektirir;
  bu bölümler crawler'lara kapalıdır.
- Bu bir gösterim ortamıdır. Gerçek öğrenci verisi veya kişisel veri içermez ve
  içermemesi gerekir.
- Şu anda tek bir onaylı kazanım (F.7.7.1.1, seri ve paralel devre şeması) ve
  tek pedagoji modeli (5E) tanımlıdır.
`;
}

export function GET(): Response {
  return new Response(build(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
