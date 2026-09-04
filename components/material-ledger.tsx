import type { WorkshopPlan } from "@/server/domain/types";

const KIND_LABEL = { consumable: "Sarf", reusable: "Kalıcı" } as const;

export function MaterialLedger({ plan }: { plan: WorkshopPlan }) {
  const lines = plan.materialPlan ?? [];
  if (lines.length === 0) return null;
  const knowsInventory = lines.every((line) => typeof line.inInventory === "boolean");
  // Only what the teacher said they do not have counts as a purchase.
  const toBuy = knowsInventory ? lines.filter((line) => !line.inInventory) : [];
  const costs = plan.costs;
  return (
    <section className="material-ledger" data-testid="material-ledger">
      <div className="ledger-heading">
        <div><span className="overline">Malzeme listesi</span><h3>Sınıf için gereken malzemeler</h3></div>
        <span>
          {plan.groupCount} grup · {plan.profile.classSize} öğrenci
          {costs ? ` · ${costs.acquisitionTry} ₺ temin · ${costs.lessonTry} ₺ sarf` : ` · ${plan.estimatedCostTry} ₺ tahmini`}
        </span>
      </div>
      <div
        className="ledger-scroll"
        tabIndex={0}
        role="group"
        aria-label="Malzeme listesi tablosu, yatay kaydırılabilir"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Malzeme</th>
              <th scope="col">Tür</th>
              <th scope="col">Birim</th>
              <th scope="col">Grup başına</th>
              <th scope="col">Sınıf toplamı</th>
              <th scope="col">Birim fiyat</th>
              <th scope="col">Liste değeri</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr data-testid={`material-line-${line.key}`} data-in-inventory={line.inInventory} key={line.key}>
                <th scope="row">{line.label}</th>
                <td className="ledger-basis">{KIND_LABEL[line.kind]}</td>
                <td className="ledger-basis">{line.basis === "student" ? `${line.quantityPerUnit} / öğrenci` : `${line.quantityPerUnit} / grup`}</td>
                <td>{line.quantityPerGroup}</td>
                <td>{line.totalQuantity}</td>
                <td>{line.unitCostTry} ₺</td>
                <td>{line.totalCostTry} ₺</td>
                <td>
                  {knowsInventory ? (
                    <span className={line.inInventory ? "supply-tag held" : "supply-tag buy"}>
                      {line.inInventory ? "Envanterinizde" : "Temin edilmeli"}
                    </span>
                  ) : (
                    <span className="ledger-basis">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Liste değeri toplamı</th>
              <td colSpan={5} />
              <td>{plan.estimatedCostTry} ₺</td>
              <td>{!knowsInventory ? "" : toBuy.length === 0 ? "Envanterden karşılanıyor" : `${toBuy.length} kalem alınacak`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {costs && (
        <dl className="ledger-costs">
          <div>
            <dt>Temin bedeli</dt>
            <dd data-testid="cost-acquisition">
              {costs.acquisitionTry} ₺<small>Envanterinizde olmayan kalemler</small>
            </dd>
          </div>
          <div>
            <dt>Sarf bedeli</dt>
            <dd data-testid="cost-lesson">
              {costs.lessonTry} ₺<small>Her uygulamada tükenen kalemler</small>
            </dd>
          </div>
          <div>
            <dt>Fiyat tarihi</dt>
            <dd>
              {costs.pricedOn}<small>Türkiye perakende tahmini</small>
            </dd>
          </div>
        </dl>
      )}
      <p className="ledger-note">
        Miktarlar {plan.groupCount} grup ve {plan.profile.groupSize} kişilik grup büyüklüğü için hesaplandı.
        {!knowsInventory
          ? ""
          : toBuy.length === 0
            ? " İşaretlediğiniz malzemeler listenin tamamını karşılıyor."
            : ` Envanterinizde bulunmayan kalemler: ${toBuy.map((line) => line.label).join(", ")}.`}
      </p>
    </section>
  );
}
