import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { Plus, Settings2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LadderSummary from '@/components/ladder/LadderSummary';
import RungRail from '@/components/ladder/RungRail';
import RungDetail from '@/components/ladder/RungDetail';
import LadderRoadmap from '@/components/ladder/LadderRoadmap';
import AllocationDonut from '@/components/ladder/AllocationDonut';
import LadderBell from '@/components/ladder/LadderBell';
import LadderSettingsSheet from '@/components/ladder/LadderSettingsSheet';
import ContributionSheet from '@/components/ladder/ContributionSheet';
import RungForm from '@/components/ladder/RungForm';
import LiquidityStrip from '@/components/ladder/LiquidityStrip';
import { DEFAULT_SETTINGS, TYPE_META } from '@/lib/ladderData';
import { contributionsFor, contributedThisMonth, fmtKES, monthStartISO, todayISO } from '@/lib/ladder';
import {
  isBufferRung, withSharedBuffer, sharedBufferBalance, bufferHistory, bufferWithdrawalDates,
} from '@/lib/ladderBuffer';
import {
  syncBudgetLines, ensureSettings, addContribution,
  syncNotifications,
} from '@/lib/ladderService';

export default function Ladder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState(null);
  const [targetRung, setTargetRung] = useState(null);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const syncingBudgets = useRef(false);
  const creatingSettings = useRef(false);

  const rungsQuery = useQuery({
    queryKey: ['ladder-rungs', user?.email],
    queryFn: () => api.entities.LadderRung.filter({ created_by: user.email }, 'order', 100),
    enabled: !!user,
  });
  const contributionsQuery = useQuery({
    queryKey: ['ladder-contributions', user?.email],
    queryFn: () => api.entities.LadderContribution.filter({ created_by: user.email }, '-contribution_date', 500),
    enabled: !!user,
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', user?.email],
    queryFn: () => api.entities.Transaction.filter({ created_by: user.email }, '-transaction_date', 500),
    enabled: !!user,
  });
  const budgetsQuery = useQuery({
    queryKey: ['budgets', user?.email],
    queryFn: () => api.entities.Budget.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const settingsQuery = useQuery({
    queryKey: ['ladder-settings', user?.email],
    queryFn: () => api.entities.LadderSettings.filter({ created_by: user.email }),
    enabled: !!user,
  });
  const notificationsQuery = useQuery({
    queryKey: ['ladder-notifications', user?.email],
    queryFn: () => api.entities.Notification.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user,
  });

  const rungs = rungsQuery.data || [];
  const contributions = contributionsQuery.data || [];
  const transactions = transactionsQuery.data || [];
  const budgets = budgetsQuery.data || [];
  const settingsList = settingsQuery.data || [];
  const notifications = notificationsQuery.data || [];

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(settingsList[0] || {}) }),
    [settingsList],
  );

  // The five buffer checkpoints read one shared balance, so every figure on this
  // tab comes from this de-duplicated set of rungs.
  const effectiveRungs = useMemo(() => withSharedBuffer(rungs, contributions), [rungs, contributions]);
  const sharedBuffer = useMemo(() => sharedBufferBalance(contributions, rungs), [rungs, contributions]);
  const withdrawalDates = useMemo(() => bufferWithdrawalDates(transactions, rungs), [transactions, rungs]);

  const activeRung = effectiveRungs.find((r) => r.status === 'active')
    || effectiveRungs.find((r) => r.status !== 'complete');

  // Keep one monthly budget line per rung.
  useEffect(() => {
    if (!user || rungs.length === 0 || budgetsQuery.isLoading || syncingBudgets.current) return;
    const needsSync = rungs.some((rung) => {
      const monthly = rung.monthly_contribution || 0;
      if (monthly <= 0) return false;
      const budget = budgets.find((b) => b.category === rung.category_label);
      return !budget || budget.amount !== monthly;
    });
    if (!needsSync) return;
    syncingBudgets.current = true;
    syncBudgetLines(rungs, budgets)
      .then(() => queryClient.invalidateQueries({ queryKey: ['budgets'] }))
      .finally(() => { syncingBudgets.current = false; });
  }, [user, rungs, budgets, budgetsQuery.isLoading, queryClient]);

  // One settings record per user.
  useEffect(() => {
    if (!user || settingsQuery.isLoading || settingsList.length > 0 || creatingSettings.current) return;
    creatingSettings.current = true;
    ensureSettings(settingsList)
      .then(() => queryClient.invalidateQueries({ queryKey: ['ladder-settings'] }))
      .finally(() => { creatingSettings.current = false; });
  }, [user, settingsQuery.isLoading, settingsList, queryClient]);

  // Generate any reminders that the rules say are due, once per period.
  useEffect(() => {
    if (!user || rungs.length === 0 || contributionsQuery.isLoading || notificationsQuery.isLoading) return;
    syncNotifications({ rungs, contributions, settings, existing: notifications })
      .then((created) => {
        if (created > 0) queryClient.invalidateQueries({ queryKey: ['ladder-notifications'] });
      });
  }, [user, rungs, contributions, settings, notifications, contributionsQuery.isLoading, notificationsQuery.isLoading, queryClient]);

  const invalidateLadder = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ladder-rungs'] }),
    queryClient.invalidateQueries({ queryKey: ['ladder-contributions'] }),
    queryClient.invalidateQueries({ queryKey: ['ladder-notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  ]);

  const handleContribution = async ({ amount, date, note }) => {
    if (!targetRung) return;
    setSaving(true);
    try {
      const { complete } = await addContribution({
        rung: targetRung, amount, date, note, rungs, sharedBalance: sharedBuffer,
      });
      setContributionOpen(false);
      await invalidateLadder();
      if (complete) {
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.7 } });
        toast({ title: 'Rung complete', description: `${targetRung.name} is done — the next rung is unlocked.` });
      } else {
        toast({ title: 'Contribution reserved', description: `${fmtKES(amount)} added to ${targetRung.name}.` });
      }
    } catch (error) {
      toast({ title: 'Could not reserve', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRung = async (form) => {
    setSaving(true);
    try {
      const category = String(form.category_label || '').trim() || `Ladder: ${form.name}`;
      if (targetRung?.id) {
        await api.entities.LadderRung.update(targetRung.id, { ...form, category_label: category });
        toast({ title: 'Rung updated' });
      } else {
        const order = rungs.reduce((max, rung) => Math.max(max, Number(rung.order) || 0), 0) + 1;
        const type = TYPE_META[form.type] ? form.type : 'buffer';
        await api.entities.LadderRung.create({
          ...form,
          order,
          type,
          current_amount: 0,
          status: 'active',
          liquidity: type === 'investment' ? 'invested' : 'liquid',
          start_date: todayISO(),
          category_label: category,
          linked_budget_category: category,
          colour: TYPE_META[type].hex,
        });
        toast({ title: 'Rung added', description: `${form.name} is ready to fund.` });
      }
      setEditOpen(false);
      setTargetRung(null);
      await invalidateLadder();
    } catch (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleRung = (id) => setExpandedId((current) => (current === id ? null : id));
  const openFor = (rung, openSetter) => { setTargetRung(rung); openSetter(true); };

  const markRead = async (notification) => {
    if (notification.read) return;
    await api.entities.Notification.update(notification.id, { read: true });
    queryClient.invalidateQueries({ queryKey: ['ladder-notifications'] });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    await api.entities.Notification.updateMany({ read: false }, { $set: { read: true } });
    queryClient.invalidateQueries({ queryKey: ['ladder-notifications'] });
  };

  const handleToggleSetting = async (key, value) => {
    const record = settingsList[0];
    if (!record) return;
    await api.entities.LadderSettings.update(record.id, { [key]: value });
    queryClient.invalidateQueries({ queryKey: ['ladder-settings'] });
  };

  const renderDetail = (rung) => {
    const buffer = isBufferRung(rung);
    // Any of the five checkpoints shows the whole buffer history, not only what
    // was logged against that one rung.
    const history = buffer ? bufferHistory(contributions, rungs) : contributionsFor(contributions, rung.id);
    const monthContributed = buffer
      ? history
        .filter((c) => (c.contribution_date || '').slice(0, 10) >= monthStartISO())
        .reduce((sum, c) => sum + (c.amount || 0), 0)
      : contributedThisMonth(contributions, rung.id);

    return (
      <RungDetail
        rung={rung}
        contributions={history}
        monthContributed={monthContributed}
        budgetAmount={budgets.find((b) => b.category === rung.category_label)?.amount || rung.monthly_contribution || 0}
        onAdd={() => openFor(rung, setContributionOpen)}
        onEdit={() => openFor(rung, setEditOpen)}
      />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Ladder</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your road from buffer to wealth</p>
        </div>
        <div className="flex items-center gap-2">
          <LadderBell notifications={notifications} onRead={markRead} onMarkAllRead={markAllRead} />
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border"
            aria-label="Ladder settings"
          >
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {rungsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rungs.length === 0 ? (
        <Card className="p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your ladder starts empty. Add a rung for whatever you are reserving for — a buffer, a debt to clear, or an investment — then add more as you go.
          </p>
          <Button onClick={() => openFor(null, setEditOpen)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add your first rung
          </Button>
        </Card>
      ) : (
        <>
          <LiquidityStrip rungs={effectiveRungs} />

          <LadderSummary rungs={effectiveRungs} activeRung={activeRung} />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-foreground">Your rungs</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{effectiveRungs.filter((r) => r.status === 'complete').length} of {effectiveRungs.length} done</span>
                <Button variant="outline" size="sm" onClick={() => openFor(null, setEditOpen)}>
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Add rung
                </Button>
              </div>
            </div>
            <RungRail rungs={effectiveRungs} expandedId={expandedId} onToggle={toggleRung} renderDetail={renderDetail} />
            <p className="pl-8 text-xs leading-5 text-muted-foreground">
              These five are one pot measured at five depths. Money is counted once, and passing one checkpoint passes every checkpoint behind it.
            </p>
          </section>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-heading font-semibold text-foreground">The whole decade</h2>
            <LadderRoadmap rungs={effectiveRungs} />
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-heading font-semibold text-foreground">Monthly allocation</h2>
            <AllocationDonut rungs={effectiveRungs} />
          </Card>
        </>
      )}

      <ContributionSheet
        open={contributionOpen}
        onOpenChange={setContributionOpen}
        rung={targetRung}
        buffer={isBufferRung(targetRung)}
        withdrawalDates={withdrawalDates}
        onSubmit={handleContribution}
        saving={saving}
      />
      <RungForm
        open={editOpen}
        onOpenChange={setEditOpen}
        rung={targetRung}
        onSave={handleSaveRung}
        saving={saving}
      />
      <LadderSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onToggle={handleToggleSetting}
      />
    </div>
  );
}