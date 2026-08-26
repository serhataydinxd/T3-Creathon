import type { WorkshopPlan } from "@/server/domain/types";

export function MaterialLedger({ plan }: { plan: WorkshopPlan }) {
  const lines = plan.materialPlan ?? [];
  if (lines.length === 0) return null;
  return (
    <section className="material-ledger" data-testid="material-ledger">
      <div className="ledger-heading">
        <div><span className="overline">Malzeme listesi</span><h3>Sınıf için gereken malzemeler</h3></div>
        <span>{plan.groupCount} grup · {plan.estimatedCostTry} ₺ tahmini</span>
      </div>
      <div className="ledger-scroll">
        <table>
          <thead>
            <tr><th scope="col">Malzeme</th><th scope="col">Grup başına</th><th scope="col">Sınıf toplamı</th><th scope="col">Birim fiyat</th><th scope="col">Toplam</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr data-testid={`material-line-${line.key}`} key={line.key}>
                <th scope="row">{line.label}</th>
                <td>{line.quantityPerGroup}</td>
                <td>{line.totalQuantity}</td>
                <td>{line.unitCostTry} ₺</td>
                <td>{line.totalCostTry} ₺</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row">Tahmini toplam</th><td colSpan={3} /><td>{plan.estimatedCostTry} ₺</td></tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
