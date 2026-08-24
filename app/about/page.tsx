import { AppShell } from "@/components/app-shell";

export default function AboutPage() {
  return (
    <AppShell>
      <section className="page about-page">
        <span className="overline">T3 Vakfı Yapay Zekâ Creathon</span>
        <h1>Problem 3 için<br />izlenebilir bir yanıt.</h1>
        <p className="about-lead">
          İMKÂN, “Bilim Türkiye AI Eğitim İçeriği Geliştirme Asistanı” problemi için geliştirilir. Genel bir sohbet robotu değil; onaylı kazanımı gerçek sınıf koşullarına uyarlayan, kodla doğrulanan ve insan onayı olmadan yayımlamayan bir içerik sistemidir.
        </p>
        <div className="about-grid" id="kaynaklar">
          <article><span>01</span><h2>Resmî kazanım</h2><p>Kaynak, sürüm ve içerik özetiyle kilitlenir. Modelin yazabileceği alanların dışında tutulur.</p></article>
          <article><span>02</span><h2>Sınırlı üretim</h2><p>Yalnızca onaylı etkinlik ve oyun mekanikleri; süre, bütçe, yaş ve malzemeye göre uyarlanır.</p></article>
          <article><span>03</span><h2>İnsan kararı</h2><p>İçerik uzmanı taslağı üretir. Ayrı bir pedagog değişiklik ister veya değişmez sürümü onaylar.</p></article>
        </div>
        <section className="source-note">
          <span className="overline">Prototip şeffaflığı</span>
          <h2>Bu sürüm neyi gerçekten yapıyor?</h2>
          <p>REPLAY modu, aynı doğrulama ve uyarlama katmanından geçen deterministik bir demo üretir. Canlı model çağrısı, kullanıcı hesabı ve kalıcı veritabanı henüz açık değildir; dolayısıyla bu herkese açık sürüm kişisel veri veya sağlayıcı anahtarı işlemez.</p>
        </section>
      </section>
    </AppShell>
  );
}
