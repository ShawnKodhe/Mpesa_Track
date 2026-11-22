import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, LogOut, PlayCircle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useAppTour } from '@/components/tour/AppTourProvider';
import ThemeSwitcher from '@/components/shared/ThemeSwitcher';

export default function Settings() {
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { startTour } = useAppTour();
  const emailMatches = confirmEmail.trim().toLowerCase() === (user?.email || '').toLowerCase();

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Delete all user transactions and budgets
      const [transactions, budgets] = await Promise.all([
        api.entities.Transaction.list('-created_date', 1000),
        api.entities.Budget.list(),
      ]);
      await Promise.all([
        ...transactions.map(t => api.entities.Transaction.delete(t.id)),
        ...budgets.map(b => api.entities.Budget.delete(b.id)),
      ]);
      queryClient.clear();
      toast({ title: 'Data deleted', description: 'All your transactions and budgets have been removed.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete data. Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Appearance */}
      <Card className="p-6">
        <h3 className="font-heading font-semibold text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground mt-0.5 mb-4">
          Dark is the aurora night theme. Paper is a warm daylight reading surface. Your choice is remembered on this device.
        </p>
        <ThemeSwitcher className="max-w-xs" />
      </Card>

      {/* App tour */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold text-foreground">App tour</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Replay the short, interactive guide to every panel.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 select-none whitespace-nowrap"
            onClick={() => startTour({ force: true })}
          >
            <PlayCircle className="w-4 h-4" />
            Replay tour
          </Button>
        </div>
      </Card>

      {/* Log out */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Sign Out</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Log out of your PesaTrack account</p>
          </div>
          <Button
            variant="outline"
            className="gap-2 select-none"
            onClick={() => { queryClient.clear(); api.auth.logout(); }}

          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground mb-1">Delete All Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete all your transactions and budgets. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 select-none" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting…' : 'Delete All Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL your transactions and budgets. This action cannot be undone.
                    To confirm, type your email address below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <Input
                    type="email"
                    placeholder={user?.email || 'Type your email'}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={deleting}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="select-none" disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={!emailMatches || deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 select-none"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </div>
  );
}