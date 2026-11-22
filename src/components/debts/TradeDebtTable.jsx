import { Card } from '@/components/ui/card';
import { kes } from '@/lib/wallet';

/**
 * Trade debts: goods or services received and not yet paid for. No cash arrived,
 * so nothing here is ever counted as money received.
 */
export default function TradeDebtTable({ rows = [] }) {
  return (
    <Card className="border-border p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">Goods on credit</h2>
        <p className="text-xs text-muted-foreground">Goods or services received, no cash arrived</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-right font-medium">Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nothing taken on credit yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.lender}</p>
                    <p className="text-xs text-muted-foreground">{row.activeCount > 0 ? 'Outstanding' : 'Settled'}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{kes(row.amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-money-out">{kes(row.balance)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.days === null ? 'No date' : `${row.days} days`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}