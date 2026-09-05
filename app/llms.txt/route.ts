import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/server/site";
import { CATALOGUE_ENTRIES, catalogueCoverage } from "@/server/content/catalogue";
import { CURRICULUM, OUTCOME_IDS } from "@/server/content/curriculum";

const REPOSITORY = "https://github.com/serhataydinxd/T3-Creathon";

/**
 * llms.txt: a Markdown brief for language models reading the site, following
 * the llmstxt.org convention. Generated rather than kept as a static file so
 * every link stays anchored to the deployment's own origin.
 */
function build(): string {
  // Coverage is computed, never written down: a brief that overstates what the
  // corpus holds is worse than no brief at all.
  const coverage = catalogueCoverage(OUTCOME_IDS.map((id) => CURRICULUM[id]));
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

İMKÂN, T3 Vakfı Bursiyer Yapay Zekâ Creathonu 2026 kapsamında "Problem 3 —
Bilim Türkiye AI Eğitim İçeriği Geliştirme Asistanı" için geliştirilmiştir.
Arayüz ve üretilen tüm içerik Türkçedir.

## Çözdüğü problem

Bilim Türkiye 30 bilim merkezinde 6-14 yaş grubuna atölye eğitimi veriyor ve
merkezler aynı donanıma sahip değil: bazısında planetaryum, bazısında sergi
alanı var. Aynı atölye konusu, imkânı farklı merkezlerde uygulanmak zorunda.

İMKÂN; süre, katılımcı sayısı, grup büyüklüğü, bütçe, elektrik, internet,
merkez donanımı, eldeki malzeme ve miktarları, hazırlık süresi ve
erişilebilirlik ihtiyaçlarını girdi olarak alır, konuyu değiştirmeden o mekânda
uygulanabilir bir oturum paketi üretir ve her rotanın neden uygulanabilir,
belirsiz veya uygulanamaz olduğunu yazar.

Ürün burada bitmez: oturum uygulandıktan sonra ne olduğu kaydedilir, bu
kayıttan bir rapor üretilir, onaylanan rapor etkinlik kütüphanesinde paylaşılır
ve başka bir merkez onu kendi imkânlarına uyarlayabilir. Akış şudur:
Tasarla → Uygula → Raporla → Paylaş → Başka merkeze uyarla.

## Bilinmeyen donanım yok sayılmaz

Merkez donanımı üç değerlidir: var, yok, bilinmiyor. Bir merkezin sayfasında
bir donanımdan söz edilmemesi o donanımın olmadığı anlamına gelmez. Gereken
donanımın durumu bilinmiyorsa rota elenmez, "bilgi eksikliği nedeniyle
belirsiz" olarak raporlanır ve neyin doğrulanması gerektiği yazılır. Yalnızca
bir kişinin yerinde doğruladığı yokluk bir rotayı eler; araştırma verisi
"yok" üretemez.

## Yapay zekânın rolü ve sınırları

Bir dil modeli yalnızca oturumun metnini yazar: aşama başlıkları, eğitmen ve
öğrenci yönergeleri, öğrenme kanıtı ve konu bağlantısı.

Aşağıdakiler kod tarafından deterministik olarak hesaplanır ve model bunları
değiştiremez:

- 5E aşamalarının sayısı ve sırası
- Aşama sürelerinin dağılımı ve toplamı
- Grup sayısı, malzeme miktarları, temin ve sarf maliyeti
- Rota uygunluğu: merkez donanımı, malzeme, format ve bütçe kontrolleri
- Rota güvenlik kısıtları
- Kilitli atölye konusu
- Merkez donanımının üç durumlu değerlendirmesi ve rota adaylarının sırası
- Planlanan ile gerçekleşen değerlerin ayrı tutulması
- Hedef merkezle uyum karşılaştırması
- Sürüm, durum geçişleri, yetki ve paylaşım kuralları

Uygulama raporunda modelin işi daha da dardır: yalnızca eğitmenin kaydettiği
olguları anlatır. Girilmemiş bir sayıyı uyduramaz, atlanmış bir aşamayı
yapılmış gösteremez, gözlenmemiş bir öğrenmeyi gerçekleşmiş sayamaz ve bir
güvenlik olayını gizleyemez. Kayıtta olmayan alan "Belirtilmedi" olarak kalır.

Taslak kaydedilirken sunucu bu iskeleti sıfırdan yeniden üretir ve yalnızca
sunucunun kendi ürettiği kayıttaki metni kullanır. Sağlayıcı yavaşlar, boş
yanıt döner veya şemayı bozarsa üretim doğrulanmış çevrimdışı plana düşer ve
bunu bir uyarı olarak bildirir.

## Korpus

- Bilim Türkiye'nin yayımlanmış atölye kataloğu tam olarak modellenmiştir:
  yedi tema, üç yaş grubu, ${CATALOGUE_ENTRIES.length} konu, kaynak sayfalarıyla.
- Bu konuların ${coverage.entriesAuthored} tanesi için İMKÂN'da onaylı içerik
  vardır (${coverage.themesAuthored}/${coverage.themesTotal} tema,
  ${coverage.cohortsAuthored}/${coverage.cohortsTotal} yaş grubu); geri kalanı
  için içerik henüz yok. Onaylı içeriği olmayan bir konu seçildiğinde İMKÂN
  pedagog onayına giren bir taslak öneri üretir ve bunu onaylı içerik gibi
  sunmaz.
- Onaylı konuların her biri için en az iki rota; toplam 16 rota.
- 26 malzeme, Türkiye perakende fiyatı ve fiyat tarihiyle.
- 30 bilim merkezi, merkez sayfalarında yayımlanan donanımıyla. Yayımlanmamış
  donanım "yok" sayılmaz.
- Dört eğitim formatı: okul grubu, tematik, uzun süreli ve çevrim içi.

## Uygulama, rapor ve kütüphane

- Uygulama kaydı yalnızca yayımlanmış bir sürümden başlatılır.
- Kayıt başlarken plan dondurulur; planlanan ve gerçekleşen değerler ayrı
  alanlarda tutulur ve birbirinin üzerine yazılmaz.
- Rapor yaşam döngüsü: taslak → incelemede → değişiklik istendi → onaylandı →
  kütüphanede yayımlandı. Onaylanmış rapor yerinde düzenlenmez, yeni sürümle
  değiştirilir.
- Eğitmen kendi uygulamasının raporunu pedagojik olarak onaylayamaz.
- Kütüphaneye giriş dört koşula bağlıdır: kaynak yayımlanmış, rapor onaylanmış,
  eğitmen paylaşıma izin vermiş ve kayıt kişisel veriden arındırılmış.
- Güvenlik olayı notları ve bireysel gereksinim açıklamaları kütüphaneye
  aktarılmaz; merkez içi raporda kalır.
- "Merkezime uyarla" kaynağı değiştirmez: bağımsız bir taslak oluşturur, konuyu
  korur ve kökenini kaydeder.
- Çocuklara ait kişisel veri toplanmaz; katılım bilgisi yalnızca toplu sayıdır.

## Pedagoji ve müfredat ilişkisi

5E, İMKÂN'ın kullandığı aşama iskeletidir. Bilim Türkiye'nin kendi yaklaşımı
"Yaparak Yaşayarak Öğrenme" ve proje tabanlı çalışmadır; İMKÂN bu yaklaşımı
uygulamaz, oturumu ölçülebilir aşamalara böler.

Bilim Türkiye atölye içeriklerinin MEB öğretim programı kazanımlarına
bağlandığına dair kamuya açık bir eşleme bulunamamıştır. Bu nedenle konular
MEB kazanımı olarak sunulmaz. Bir konunun okulda öğrenilenle tamamlayıcılığı
varsa, ilgili öğrenme çıktısı kodu ayrı bir alan olarak gösterilir ve alan
uzmanı doğrulaması beklediği belirtilir.

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

- Oturum üretimi, inceleme ve yayım akışı oturum açmayı gerektirir; bu
  bölümler crawler'lara kapalıdır.
- Bu bir gösterim ortamıdır. Gerçek öğrenci verisi veya kişisel veri içermez ve
  içermemesi gerekir.
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
