import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { safeReturnTo } from "@/lib/authReturnTo";
import { clearPinLock, hasPinLock, renewPinLock, verifyPin } from "@/lib/pinLock";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, KeyRound } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinAvailable, setPinAvailable] = useState(() => hasPinLock());
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const { completePinUnlock } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    api.auth.loginWithProvider("google", safeReturnTo());
  };

  const handlePinUnlock = async (e) => {
    e.preventDefault();
    setPinError("");
    if (!/^\d{6}$/.test(pin)) {
      setPinError("Enter your 6-digit PIN.");
      return;
    }
    setPinLoading(true);
    try {
      const stored = await verifyPin(pin);
      // The live Supabase session survives a device lock, so it is the source
      // of truth. The encrypted copy is only a fallback for older PIN records.
      const { data: live } = await supabase.auth.getSession();
      if (!live?.session) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: stored.access_token,
          refresh_token: stored.refresh_token,
        });
        if (sessionError) {
          clearPinLock();
          setPinAvailable(false);
          setUsePin(false);
          setPin("");
          setError("Your PIN session has expired. Sign in with your email and password to set it up again.");
          return;
        }
        if (data?.session) {
          try { await renewPinLock(pin, data.session); } catch { /* keep the existing stored session */ }
        }
      }
      await completePinUnlock();
      window.location.href = safeReturnTo();
    } catch (err) {
      setPinError(err.message || "Could not unlock with PIN");
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      {pinAvailable && !usePin && (
        <Button
          variant="secondary"
          className="w-full h-12 text-sm font-medium mb-6 gap-2"
          onClick={() => { setUsePin(true); setError(""); }}
        >
          <KeyRound className="w-4 h-4" />
          Unlock with PIN
        </Button>
      )}

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && !usePin && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {usePin ? (
        <>
          {pinError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {pinError}
            </div>
          )}
          <form onSubmit={handlePinUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">6-digit PIN</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="pl-10 h-12 tracking-[0.4em]"
                  disabled={pinLoading}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium" disabled={pinLoading}>
              {pinLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlocking…
                </>
              ) : (
                "Unlock with PIN"
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <button
              type="button"
              onClick={() => { setUsePin(false); setPin(""); setPinError(""); }}
              className="text-primary font-medium hover:underline"
            >
              Use email and password instead
            </button>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}