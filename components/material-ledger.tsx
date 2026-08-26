import type { WorkshopPlan } from "@/server/domain/types";

export function MaterialLedger({ plan }: { plan: WorkshopPlan }) {
  const lines = plan.materialPlan ?? [];
  if (lines.length === 0) return null;
  const toBuy = lines.filter((line) => !line.availableByDefault && line.totalCostTry > 0);
  return (
    <section className="material-ledger" data-testid="material-ledger">
      <div className="ledger-heading">
        <div><span className="overline">Malzeme listesi</span><h3>Sınıf için gereken malzemeler</h3></div>
        <span>{plan.groupCount} grup · {plan.profile.classSize} öğrenci · {plan.estimatedCostTry} ₺ tahmini</span>
      </div>
      <div className="ledger-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Malzeme</th>
              <th scope="col">Birim</th>
              <th scope="col">Grup başına</th>
              <th scope="col">Sınıf toplamı</th>
              <th scope="col">Birim fiyat</th>
              <th scope="col">Toplam</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr data-testid={`material-line-${line.key}`} key={line.key}>
                <th scope="row">{line.label}</th>
                <td className="ledger-basis">{line.basis === "student" ? `${line.quantityPerUnit} / öğrenci` : `${line.quantityPerUnit} / grup`}</td>
                <td>{line.quantityPerGroup}</td>
                <td>{line.totalQuantity}</td>
                <td>{line.unitCostTry} ₺</td>
                <td>{line.totalCostTry} ₺</td>
                <td>
                  <span className={line.availableByDefault ? "supply-tag held" : "supply-tag buy"}>
                    {line.availableByDefault ? "Sınıfta mevcut" : "Temin edilmeli"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Tahmini toplam</th>
              <td colSpan={4} />
              <td>{plan.estimatedCostTry} ₺</td>
              <td>{toBuy.length === 0 ? "Envanterden karşılanıyor" : `${toBuy.length} kalem alınacak`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="ledger-note">
        Miktarlar {plan.groupCount} grup ve {plan.profile.groupSize} kişilik grup büyüklüğü için hesaplandı.
        {toBuy.length === 0
          ? " Listedeki her malzeme varsayılan sınıf envanterinde bulunuyor; tutar yalnızca sarf maliyetidir."
          : ` Temin edilmesi gereken kalemler: ${toBuy.map((line) => line.label).join(", ")}.`}
      </p>
    </section>
  );
}
