import type { Component } from 'solid-js';
import { createSignal, createMemo, Show } from 'solid-js';
import { authClient } from './App';

// ── Icons ────────────────────────────────────────────────────────────

const UserIcon = () => (
  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const MailIcon = () => (
  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const LockIcon = () => (
  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg class="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const GitHubIcon = () => (
  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

// ── Password Strength ────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-strength-weak' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-strength-fair' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-strength-good' };
  return { score: 4, label: 'Strong', color: 'bg-strength-strong' };
}

// ── Auth Page Component ──────────────────────────────────────────────

export const AuthPage: Component = () => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [name, setName] = createSignal('');
  const [isSignUp, setIsSignUp] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [githubLoading, setGithubLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [shakeForm, setShakeForm] = createSignal(false);

  const passwordStrength = createMemo(() => getPasswordStrength(password()));

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 400);
  };

  const handleSignIn = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: email(),
        password: password(),
      });
      if (result.error) {
        setError(result.error.message || 'Sign in failed. Please check your credentials.');
        triggerShake();
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: Event) => {
    e.preventDefault();
    setError('');
    if (passwordStrength().score < 2) {
      setError('Please choose a stronger password.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        email: email(),
        password: password(),
        name: name(),
      });
      if (result.error) {
        setError(result.error.message || 'Sign up failed. Please try again.');
        triggerShake();
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setError('');
    setGithubLoading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: window.location.origin,
      });
    } catch (err: any) {
      setError(err?.message || 'GitHub sign in failed. Please try again.');
      triggerShake();
      setGithubLoading(false);
    }
  };

  const toggleMode = (e: Event) => {
    e.preventDefault();
    setError('');
    setIsSignUp(!isSignUp());
  };

  return (
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#58a6ff] mb-4">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-[#c9d1d9] tracking-tight">Enfinyte</h1>
          <p class="text-sm text-[#8b949e] mt-1">
            {isSignUp() ? 'Create your account to get started' : 'Welcome back. Sign in to continue.'}
          </p>
        </div>

        {/* Card */}
        <div class="bg-[#161b22] border border-[#30363d] rounded-lg p-8">

          {/* Error Alert */}
          <Show when={error()}>
            <div class="mb-5 flex items-start gap-3 rounded-md bg-[#da3633]/10 border border-[#da3633]/30 px-4 py-3 text-sm text-[#f85149] animate-slide-down">
              <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error()}</span>
            </div>
          </Show>

          <form onSubmit={isSignUp() ? handleSignUp : handleSignIn} class="space-y-5">
            {/* Name field (sign up only) */}
            <Show when={isSignUp()}>
              <div class="animate-slide-down">
                <label class="block text-xs font-medium text-[#8b949e] mb-2">
                  Name
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon />
                  </div>
                  <input
                    type="text"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                    placeholder="Your full name"
                    class="w-full pl-10 pr-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                    required
                  />
                </div>
              </div>
            </Show>

            {/* Email field */}
            <div>
              <label class="block text-xs font-medium text-[#8b949e] mb-2">
                Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MailIcon />
                </div>
                <input
                  type="email"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  placeholder="you@example.com"
                  class="w-full pl-10 pr-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label class="block text-xs font-medium text-[#8b949e] mb-2">
                Password
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder={isSignUp() ? 'Create a strong password' : 'Enter your password'}
                  class="w-full pl-10 pr-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-sm placeholder-[#6e7681] transition-colors duration-150 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  required
                />
              </div>

              {/* Password Strength Indicator (sign up only) */}
              <Show when={isSignUp() && password()}>
                <div class="mt-3 animate-fade-in">
                  <div class="flex gap-1.5 mb-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        class={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength().score >= level
                            ? passwordStrength().color
                            : 'bg-[#21262d]'
                        }`}
                      />
                    ))}
                  </div>
                  <p class={`text-xs ${
                    passwordStrength().score <= 1 ? 'text-strength-weak' :
                    passwordStrength().score <= 2 ? 'text-strength-fair' :
                    passwordStrength().score <= 3 ? 'text-strength-good' :
                    'text-strength-strong'
                  }`}>
                    {passwordStrength().label}
                  </p>
                </div>
              </Show>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading()}
              class="
                w-full py-2 rounded-md font-medium text-sm text-white
                bg-[#238636] hover:bg-[#2ea043]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
                flex items-center justify-center gap-2
                cursor-pointer
              "
            >
              <Show when={loading()} fallback={
                <>
                  {isSignUp() ? 'Create Account' : 'Sign In'}
                </>
              }>
                <SpinnerIcon />
                <span>{isSignUp() ? 'Creating account...' : 'Signing in...'}</span>
              </Show>
            </button>
          </form>

          {/* Divider */}
          <div class="flex items-center gap-3 my-6">
            <div class="flex-1 h-px bg-[#21262d]" />
            <span class="text-xs text-[#6e7681]">or continue with</span>
            <div class="flex-1 h-px bg-[#21262d]" />
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={loading() || githubLoading()}
            class="
              w-full py-2 rounded-md font-medium text-sm text-[#c9d1d9]
              bg-[#21262d] border border-[#30363d]
              hover:bg-[#30363d] hover:border-[#484f58]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              flex items-center justify-center gap-3
              cursor-pointer
            "
          >
            <Show when={githubLoading()} fallback={
              <>
                <GitHubIcon />
                <span>GitHub</span>
              </>
            }>
              <SpinnerIcon />
              <span>Redirecting...</span>
            </Show>
          </button>

          {/* Toggle mode */}
          <p class="text-center text-sm text-[#8b949e] mt-6">
            {isSignUp() ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a
              href="#"
              onClick={toggleMode}
              class="text-[#58a6ff] hover:underline font-medium transition-all duration-150"
            >
              {isSignUp() ? 'Sign in' : 'Sign up'}
            </a>
          </p>
        </div>

        {/* Footer */}
        <p class="text-center text-xs text-[#6e7681] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
