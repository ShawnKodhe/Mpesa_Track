import { Card } from '@/components/ui/card';
import { kes } from '@/lib/wallet';

/** Cash loans only: money that actually arrived, read against the ledger. */
export default function CashLoanTable({ rows = [] }) {
  return (
    <Card className="border-border p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">Cash loans</h2>
        <p className="text-xs text-muted-foreground">Money that actually arrived and is in the Wallet</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Lender</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Repaid</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-right font-medium">Interest</th>
              <th className="px-4 py-3 text-right font-medium">Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No cash loans on the record.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{row.lender}</p>
                    <p className="text-xs text-muted-foreground">{row.activeCount > 0 ? 'Active' : 'Settled'}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{kes(row.drawn)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-money-moved">{kes(row.repaid)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-money-out">{kes(row.balance)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{kes(row.interest)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.days === null ? 'Not drawn' : `${row.days} days`}
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