import { appUrl, supabase } from './supabase';

const PROFILE_FIELDS = [
  'full_name',
  'role',
  'phone_number',
  'profile_picture',
  'currency',
  'onboarded',
];

/**
 * The app uses one user object: auth fields plus the app-specific profile row.
 * This keeps every screen (and the edge functions) working with the same shape.
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackName = user.user_metadata?.full_name || String(user.email || '').split('@')[0];
    const result = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: fallbackName }, { onConflict: 'id' })
      .select()
      .single();
    if (result.error) throw result.error;
    profile = result.data;
  }

  return {
    ...profile,
    id: user.id,
    email: user.email,
    full_name: profile.full_name || user.user_metadata?.full_name || String(user.email || '').split('@')[0],
  };
}

export async function updateMe(patch = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You are not signed in');

  const profilePatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => PROFILE_FIELDS.includes(key)),
  );

  if (profilePatch.full_name) {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: profilePatch.full_name },
    });
    if (error) throw error;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', user.id);
    if (error) throw error;
  }

  return getCurrentUser();
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp({ email, password, full_name }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: full_name ? { full_name } : {},
      emailRedirectTo: `${appUrl}/`,
    },
  });
}

export async function signInWithGoogle(returnTo = '/') {
  const safe = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${appUrl}${safe}` },
  });
}

async function invokeAuthFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}

/** Supabase creates the one-time link; Resend delivers it. */
export async function resetPasswordRequest(email) {
  return invokeAuthFunction('request-password-reset', { email });
}

/** Save a backup address and send its verification link through Resend. */
export async function setSecondaryEmail(email) {
  return invokeAuthFunction('set-secondary-email', { email });
}

/** Redeem the one-time token emailed to the backup address. */
export async function verifySecondaryEmail(token) {
  return invokeAuthFunction('verify-secondary-email', { token });
}

/** Exchange the recovery link, then set the new password. */
export async function completePasswordRecovery({ code, tokenHash, newPassword }) {
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error) throw error;
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}
