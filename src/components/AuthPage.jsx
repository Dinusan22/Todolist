import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Moon, Sun } from 'lucide-react';
import { api } from '../services/api.js';

export default function AuthPage({ view, message, theme, onThemeChange, onNavigate, onSignedIn }) {
  const register = view === 'sign-up';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setError(''); setPassword(''); setConfirmation(''); setShowPassword(false); setShowConfirmation(false); }, [view]);

  function switchView(next) { if (!busy) { setNotice(''); onNavigate(next); } }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError(''); setNotice('');
    if (register && password !== confirmation) { setError('Your passwords do not match. Please check them and try again.'); return; }
    setBusy(true);
    try {
      if (register) {
        await api.register(fullName.trim(), email, password);
        if (!mounted.current) return;
        setPassword(''); setConfirmation(''); setNotice('Your account is ready. Sign in to continue.'); onNavigate('sign-in');
      } else {
        const token = await api.login(email, password);
        if (!mounted.current) return;
        setPassword(''); onSignedIn({ token, email: email.trim() });
      }
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  }

  return <div className="auth-page">
    <header className="topbar"><div className="topbar-inner"><button className="brand brand-button" type="button" onClick={() => onNavigate('tasks')} disabled={busy} aria-label="Todo, go to task list"><span className="brand-mark"><Check size={21} strokeWidth={2.5} /></span>Todo.</button><div className="topbar-actions"><button className="text-button back-to-list" type="button" onClick={() => onNavigate('tasks')} disabled={busy}><ArrowLeft size={15} />Back to list</button><button className="icon-button" type="button" onClick={onThemeChange} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button></div></div></header>
    <main className="auth-main">
      <div className="auth-intro"><div className="eyebrow"><span />ONE TASK AT A TIME</div><h1>{register ? 'A fresh start.' : 'Welcome back.'}</h1><p>{register ? 'Create an account. Make room for what matters.' : 'A clear mind starts with a little progress.'}</p></div>
      <section className="auth-card" aria-label={register ? 'Sign up' : 'Sign in'}>
        <nav className="auth-tabs" aria-label="Account pages"><button type="button" className={!register ? 'active' : ''} aria-pressed={!register} onClick={() => switchView('sign-in')} disabled={busy}>Sign in</button><button type="button" className={register ? 'active' : ''} aria-pressed={register} onClick={() => switchView('sign-up')} disabled={busy}>Sign up</button></nav>
        <div className="auth-card-heading"><h2>{register ? 'Create your account' : 'Sign in to your account'}</h2><p>{register ? 'Your next step starts here.' : 'Pick up where you left off.'}</p></div>
        {message && !register && <p className="inline-notice" role="status">{message}</p>}
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <form onSubmit={submit}>
        {register && (
  <>
    <label className="field-label" htmlFor="auth-fullname">
      Full Name
    </label>

    <div className="auth-input">
      <input
        id="auth-fullname"
        type="text"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Enter your full name"
        autoComplete="name"
        maxLength={100}
        required
        disabled={busy}
      />
    </div>
  </>
)}
          <label className="field-label" htmlFor="auth-email">Email address</label><div className="auth-input"><Mail size={16} aria-hidden="true" /><input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="you@example.com" maxLength={254} required disabled={busy} /></div>
          <label className="field-label" htmlFor="auth-password">Password</label><div className="auth-input"><LockKeyhole size={16} aria-hidden="true" /><input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Create a password' : 'Enter your password'} required disabled={busy} /><button className="icon-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={busy}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          {register && <><label className="field-label" htmlFor="auth-confirmation">Confirm password</label><div className="auth-input"><LockKeyhole size={16} aria-hidden="true" /><input id="auth-confirmation" type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Enter your password again" required disabled={busy} /><button className="icon-button" type="button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} disabled={busy}>{showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></>}
          <button className="button primary full-width auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={16} />}</button>
        </form>
        <div className="auth-footer"><span>{register ? 'Already have an account?' : 'New here?'}</span><button className="text-button" type="button" disabled={busy} onClick={() => switchView(register ? 'sign-in' : 'sign-up')}>{register ? 'Sign in' : 'Create an account'}</button></div>
      </section>
      <button type="button" className="text-button auth-demo-link" onClick={() => onNavigate('tasks')} disabled={busy}>Explore the task list <ArrowRight size={14} /></button>
      <footer className="page-footer"><span className="footer-rule" /><p>A little progress, every day.</p><span className="footer-rule" /></footer>
    </main>
  </div>;
}
