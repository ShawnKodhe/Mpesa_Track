import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MpesaImport({ open, onClose }) {
  const [messages, setMessages] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!messages.trim()) return;
    setLoading(true);
    try {
      const { data: result, error } = await api.functions.invoke('parseMpesa', { body: { messages } });
      if (error || result?.error) throw new Error(result?.error || error?.message || 'Could not parse the messages');

      if (result?.transactions?.length > 0) {
        await api.entities.Transaction.bulkCreate(result.transactions);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        toast.success(`Imported ${result.transactions.length} transactions`);
        setMessages('');
        onClose();
      } else {
        toast.error('Could not parse any transactions from the messages');
      }
    } catch (err) {
      toast.error(err.message || 'Could not parse any transactions from the messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI M-Pesa Import
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Paste M-Pesa SMS Messages</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Paste one or more M-Pesa confirmation messages. AI will automatically parse and categorize them.
            </p>
            <Textarea
              placeholder="e.g. SLK4H7J9KQ Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 15/5/24..."
              value={messages}
              onChange={(e) => setMessages(e.target.value)}
              rows={8}
            />
          </div>
          <Button onClick={handleImport} disabled={loading || !messages.trim()} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Parsing messages...' : 'Import with AI'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}