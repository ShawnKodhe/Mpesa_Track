import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Phone, User, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 'welcome', title: 'Welcome to PesaTrack', subtitle: 'Your M-Pesa finance manager' },
  { id: 'profile', title: "Set up your profile", subtitle: 'Tell us a bit about yourself' },
  { id: 'phone', title: 'Your M-Pesa number', subtitle: 'Used to match your transactions' },
  { id: 'done', title: "You're all set!", subtitle: 'Start tracking your finances' },
];

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const { file_url } = await api.storage.uploadFile({ file });
    setAvatar(file_url);
  };

  const handleFinish = async () => {
    setSaving(true);
    await api.auth.updateMe({
      phone_number: phone,
      profile_picture: avatar || null,
      onboarded: true,
    });
    setSaving(false);
    onComplete();
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-sm flex flex-col items-center text-center"
        >
          {/* Step: Welcome */}
          {step === 0 && (
            <>
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg">
                <span className="text-primary-foreground font-heading font-bold text-4xl">M</span>
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{current.title}</h1>
              <p className="text-muted-foreground mb-10">{current.subtitle}</p>
              <Button className="w-full select-none" size="lg" onClick={() => setStep(1)}>
                Get Started
              </Button>
            </>
          )}

          {/* Step: Profile */}
          {step === 1 && (
            <>
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{current.title}</h1>
              <p className="text-muted-foreground mb-8">{current.subtitle}</p>
              <div className="w-full text-left space-y-2 mb-8">
                <Label>Your name</Label>
                <Input value={name} readOnly className="bg-secondary/50" placeholder="Fetched from account" />
                <p className="text-xs text-muted-foreground">Name is linked to your account and cannot be changed here.</p>
              </div>
              <Button className="w-full select-none" size="lg" onClick={() => setStep(2)}>
                Continue
              </Button>
            </>
          )}

          {/* Step: Phone */}
          {step === 2 && (
            <>
              <div className="w-20 h-20 rounded-2xl bg-buffer/10 border border-buffer/20 flex items-center justify-center mb-6">
                <Phone className="w-10 h-10 text-buffer" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{current.title}</h1>
              <p className="text-muted-foreground mb-8">{current.subtitle}</p>
              <div className="w-full text-left space-y-2 mb-8">
                <Label>Phone number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button className="w-full select-none" size="lg" onClick={() => setStep(3)}>
                Continue
              </Button>
              <button className="mt-3 text-sm text-muted-foreground select-none" onClick={() => setStep(3)}>
                Skip for now
              </button>
            </>
          )}

          {/* Step: Done */}
          {step === 3 && (
            <>
              <div className="w-20 h-20 rounded-full bg-inflow/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-inflow" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{current.title}</h1>
              <p className="text-muted-foreground mb-10">{current.subtitle}</p>
              <Button className="w-full select-none" size="lg" onClick={handleFinish} disabled={saving}>
                {saving ? 'Saving…' : 'Start Tracking'}
              </Button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}