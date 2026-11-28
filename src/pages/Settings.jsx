import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { changePinLock, clearPinLock, hasPinLock, lockApp, setPinLock, verifyPin } from '@/lib/pinLock';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, LogOut, PlayCircle, Loader2, KeyRound } from 'lucide-react';

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
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pinEnabled, setPinEnabled] = useState(() => hasPinLock());
  const [pinMode, setPinMode] = useState(null); // 'enable' | 'change' | 'remove'
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinConfirmOpen, setPinConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, navigateToLogin } = useAuth();
  const { startTour } = useAppTour();
  const emailMatches = confirmEmail.trim().toLowerCase() === (user?.email || '').toLowerCase();

  const resetPinForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMode(null);
  };

  const requestPinConfirm = (e) => {
    e.preventDefault();
    if (pinMode !== 'enable' && !/^\d{6}$/.test(currentPin)) {
      toast({ title: 'Enter your current 6-digit PIN', variant: 'destructive' });
      return;
    }
    if (pinMode !== 'remove') {
      if (!/^\d{6}$/.test(newPin)) {
        toast({ title: 'Choose a 6-digit PIN', variant: 'destructive' });
        return;
      }
      if (newPin !== confirmPin) {
        toast({ title: 'PINs do not match', variant: 'destructive' });
        return;
      }
    }
    setPinConfirmOpen(true);
  };

  const confirmPinAction = async () => {
    setPinBusy(true);
    try {
      if (pinMode === 'remove') {
        await verifyPin(currentPin);
        clearPinLock();
        setPinEnabled(false);
        toast({ title: 'PIN unlock removed', description: 'This device no longer unlocks with a PIN.' });
      } else {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!session) throw new Error('Your session has expired. Sign in again first.');
        if (pinMode === 'enable') {
          await setPinLock(newPin, session);
          setPinEnabled(true);
          toast({ title: 'PIN unlock enabled', description: 'You can now unlock this device with your 6-digit PIN.' });
        } else {
          await changePinLock(currentPin, newPin, session);
          toast({ title: 'PIN changed', description: 'Your new PIN is ready to use.' });
        }
      }
      setPinConfirmOpen(false);
      resetPinForm();
    } catch (err) {
      toast({
        title: 'Could not save PIN',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPinBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Use at least 6 characters for your password', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password changed', description: 'Your new password is active.' });
    } catch (err) {
      toast({
        title: 'Could not change password',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

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

      {/* Password */}
      <Card className="p-6">
        <h3 className="font-heading font-semibold text-foreground">Password</h3>
        <p className="text-sm text-muted-foreground mt-0.5 mb-4">
          Confirm your current password, then choose a new one. You stay signed in on this device.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>
          <Button type="submit" className="gap-2 select-none" disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Changing…
              </>
            ) : (
              'Change password'
            )}
          </Button>
        </form>
      </Card>

      {/* PIN unlock */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-semibold text-foreground">PIN unlock</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pinEnabled
                ? 'This device can be unlocked with your 6-digit PIN.'
                : 'Add a 6-digit PIN to unlock this device without typing your email and password.'}
            </p>
          </div>
          {pinEnabled && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-inflow/10 px-2.5 py-1 text-xs font-medium text-inflow">
              <KeyRound className="w-3.5 h-3.5" />
              On
            </span>
          )}
        </div>

        {pinMode ? (
          <form onSubmit={requestPinConfirm} className="mt-4 space-y-4">
            {pinMode !== 'enable' && (
              <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="off"
                  placeholder="••••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  disabled={pinBusy}
                  required
                />
              </div>
            )}
            {pinMode !== 'remove' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-pin">New PIN</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="off"
                    placeholder="••••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    disabled={pinBusy}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">Confirm new PIN</Label>
                  <Input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="off"
                    placeholder="••••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    disabled={pinBusy}
                    required
                  />
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="gap-2 select-none" disabled={pinBusy}>
                <KeyRound className="w-4 h-4" />
                {pinMode === 'remove' ? 'Review removal' : pinMode === 'enable' ? 'Review setup' : 'Review change'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetPinForm} disabled={pinBusy}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {pinEnabled ? (
              <>
                <Button variant="outline" className="gap-2 select-none" onClick={() => setPinMode('change')}>
                  <KeyRound className="w-4 h-4" />
                  Change PIN
                </Button>
                <Button variant="outline" className="select-none" onClick={() => setPinMode('remove')}>
                  Remove PIN
                </Button>
              </>
            ) : (
              <Button variant="outline" className="gap-2 select-none" onClick={() => setPinMode('enable')}>
                <KeyRound className="w-4 h-4" />
                Set up PIN
              </Button>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Your PIN and encrypted session stay on this device. On another device, sign in with your email or Google account.
        </p>
      </Card>

      <AlertDialog open={pinConfirmOpen} onOpenChange={(open) => { if (!pinBusy) setPinConfirmOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pinMode === 'remove' ? 'Remove PIN unlock?' : pinMode === 'change' ? 'Change your PIN?' : 'Enable PIN unlock?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pinMode === 'remove'
                ? 'This device will no longer unlock with a PIN. You will need your email and password next time.'
                : pinMode === 'change'
                  ? 'Your new PIN will replace the current one on this device.'
                  : 'This PIN is stored on this device only, encrypted with the PIN you choose. It will not work on another device.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pinBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPinAction} disabled={pinBusy}>
              {pinBusy ? 'Saving…' : pinMode === 'remove' ? 'Remove PIN' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Log out */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Sign Out</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Log out of your PesaTrack account
              {pinEnabled && ' — this locks the device; your PIN unlocks it again'}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 select-none"
            onClick={() => {
              queryClient.clear();
              if (pinEnabled) { lockApp(); navigateToLogin(); } else api.auth.logout();
            }}

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