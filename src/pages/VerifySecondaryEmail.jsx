import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import AuthLayout from '@/components/AuthLayout';
import { CheckCircle2, Loader2, MailCheck, AlertTriangle } from 'lucide-react';

export default function VerifySecondaryEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const started = useRef(false);
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api.auth.verifySecondaryEmail(token)
      .then((result) => {
        setState('success');
        setMessage(result?.email || '');
      })
      .catch((error) => {
        setState('error');
        setMessage(error?.message || 'We could not verify that address.');
      });
  }, [token]);

  const icon = state === 'loading' ? Loader2 : state === 'success' ? CheckCircle2 : AlertTriangle;
  const title = state === 'loading'
    ? 'Checking the link'
    : state === 'success'
      ? 'Backup email confirmed'
      : 'Link not valid';

  return (
    <AuthLayout
      icon={icon}
      title={title}
      subtitle={state === 'loading' ? 'Just a moment…' : 'MpesaTrack account recovery'}
      footer={
        <Link to="/profile" className="text-primary font-medium hover:underline">
          Go to your profile
        </Link>
      }
    >
      {state === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          Verifying your backup address…
        </div>
      )}

      {state === 'success' && (
        <div className="text-center space-y-4">
          <MailCheck className="w-10 h-10 mx-auto text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-medium break-all">{message}</span> can now be used to reset your password.
          </p>
          <p className="text-xs text-muted-foreground">
            You can also use it on the forgot-password screen if you ever lose access to your main inbox.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{message || 'This verification link is invalid or has expired.'}</p>
          <p className="text-xs text-muted-foreground">
            Open Profile → Backup recovery email and request a fresh link.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
