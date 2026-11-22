import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

async function fetchUsage() {
  const response = await api.functions.invoke('usageStats');
  if (response?.error) {
    let detail = '';
    try {
      const body = await response?.response?.json?.();
      detail = body?.error || '';
    } catch (error) {
      // Fall back to the SDK message when the body is not readable.
    }
    throw new Error(detail || response.error.message || 'Could not read usage');
  }
  return response.data;
}

function Balance({ name, prefix, data }) {
  const remaining = Number.isFinite(data?.remaining) ? data.remaining : null;
  const limit = Number.isFinite(data?.limit) ? data.limit : null;
  const low = remaining !== null && limit !== null && limit > 0 && remaining / limit < 0.15;
  const tone = remaining === null || remaining <= 0 || data?.error
    ? 'text-destructive'
    : low
      ? 'text-amber-500'
      : 'text-foreground';

  const text = remaining !== null
    ? `${compact.format(remaining)} ${data.unit === 'characters' ? 'chars' : 'credits'} left`
    : data?.error ? 'unavailable' : 'not set';

  const title = remaining !== null
    ? `${name}: ${compact.format(remaining)} of ${limit === null ? 'unlimited' : compact.format(limit)} ${data.unit} left${data.label ? ` · ${data.label}` : ''}`
    : `${name}: ${data?.error || 'not configured'}`;

  return (
    <span className={`whitespace-nowrap ${tone}`} title={title}>
      <span className="text-muted-foreground">{prefix} </span>
      {text}
    </span>
  );
}

export default function CreditUsage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-credit-usage'],
    queryFn: fetchUsage,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) return <span className="whitespace-nowrap text-muted-foreground">Checking credits…</span>;
  if (isError || !data) {
    return <span className="whitespace-nowrap text-muted-foreground" title="Could not read the credit balances">Credits unavailable</span>;
  }

  return (
    <span className="flex items-center gap-1.5">
      <Balance name="ElevenLabs" prefix="EL" data={data.elevenlabs} />
      <span className="text-border" aria-hidden="true">·</span>
      <Balance name="Base44" prefix="B44" data={data.base44} />
    </span>
  );
}
