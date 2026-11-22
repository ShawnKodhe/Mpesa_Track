import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, User, Phone, Mail, Save, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then((u) => {
      setUser(u);
      setPhone(u?.phone_number || '');
      setSecondaryEmail(u?.secondary_email || '');
      setAvatarPreview(u?.profile_picture || null);
    });
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const { file_url } = await api.storage.uploadFile({ file });
    await api.auth.updateMe({ profile_picture: file_url });
    toast({ title: 'Photo updated' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe({ phone_number: phone });
      toast({ title: 'Profile saved', description: 'Your details have been updated.' });
    } catch (error) {
      toast({ title: 'Could not save', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupSave = async () => {
    const value = secondaryEmail.trim().toLowerCase();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast({ title: 'Check that address', description: 'Enter a valid email or leave it blank to remove the backup.', variant: 'destructive' });
      return;
    }
    if (value && value === (user?.email || '').toLowerCase()) {
      toast({ title: 'Use a different address', description: 'Your backup cannot be the same as your sign-in email.', variant: 'destructive' });
      return;
    }

    setSavingBackup(true);
    try {
      const result = await api.auth.setSecondaryEmail(value);
      const refreshed = await api.auth.me();
      setUser(refreshed);
      if (result?.status === 'verification_sent') {
        toast({ title: 'Check your inbox', description: `We sent a verification link to ${value}.` });
      } else if (result?.status === 'removed') {
        setSecondaryEmail('');
        toast({ title: 'Backup removed', description: 'Password resets will only go to your sign-in email.' });
      } else {
        toast({ title: 'Backup email saved' });
      }
    } catch (error) {
      toast({ title: 'Could not update backup email', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingBackup(false);
    }
  };

  const typedBackup = secondaryEmail.trim().toLowerCase();
  const activeBackup = (user?.secondary_email || '').toLowerCase();
  const pendingBackup = (user?.pending_secondary_email || '').toLowerCase();
  const backupVerified = Boolean(activeBackup && user?.secondary_email_verified_at) && typedBackup === activeBackup;
  const backupPending = Boolean(pendingBackup) && typedBackup === pendingBackup;
  const backupStatus = backupVerified
    ? 'Verified — this address can reset your password.'
    : backupPending
      ? 'Check this inbox and tap the verification link.'
      : typedBackup
        ? 'Not verified yet. Save it, then check the inbox.'
        : 'No backup set. Add one in case you lose access to your main inbox.';

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal details</p>
      </div>

      {/* Avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-heading font-bold text-2xl">{initials}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="font-heading font-semibold text-foreground text-lg">{user?.full_name || '—'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card className="p-6 space-y-5">
        <h3 className="font-heading font-semibold text-foreground">Account Details</h3>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Full Name
          </Label>
          <Input value={user?.full_name || ''} readOnly className="bg-secondary/40" />
          <p className="text-xs text-muted-foreground">Name is managed by your account provider.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Email
          </Label>
          <Input value={user?.email || ''} readOnly className="bg-secondary/40" />
        </div>

        <div className="space-y-2" data-tour="backup-email">
          <Label htmlFor="backup-email" className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Backup recovery email
          </Label>
          <div className="flex gap-2">
            <Input
              id="backup-email"
              type="email"
              placeholder="backup@example.com"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleBackupSave}
              disabled={savingBackup}
              className="gap-2 whitespace-nowrap select-none"
            >
              {savingBackup && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingBackup ? 'Saving…' : !typedBackup ? 'Remove' : backupVerified ? 'Change' : 'Save & verify'}
            </Button>
          </div>
          <p className={`text-xs ${backupVerified ? 'text-primary' : 'text-muted-foreground'}`}>
            {backupStatus}
          </p>
          <p className="text-xs text-muted-foreground">
            Used only if you enter it on the forgot-password screen. We verify it first so nobody else can add it.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" /> M-Pesa Phone Number
          </Label>
          <Input
            type="tel"
            placeholder="e.g. 0712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 select-none">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
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
    </div>
  );
}