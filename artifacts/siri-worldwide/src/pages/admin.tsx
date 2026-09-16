import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Clock3, KeyRound, LoaderCircle, LockKeyhole, LogOut, MessageSquareText, RefreshCw, ShieldCheck, Trash2, Users, WifiOff } from 'lucide-react';
import { useVerifyAdmin } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type Auth, type User as FirebaseUser } from 'firebase/auth';
import { deleteMessage, loadMessages, type Message } from '@/lib/siri-persistence';
import { getFirebaseAuth, isFirebaseAuthConfigured } from '@/lib/firebase-auth';

type GateState = 'config' | 'checking' | 'signed-out' | 'signing-in' | 'verifying' | 'authorized' | 'denied' | 'error';

const USERS = [
  { id: 'marcus', name: 'Marcus Reed', initials: 'MR', language: 'English', location: 'Brooklyn, New York', role: 'English speaker' },
  { id: 'amina', name: 'Amina Otieno', initials: 'AO', language: 'Kiswahili', location: 'Nairobi, Kenya', role: 'Swahili speaker' },
];

function formatAdminDate(timestamp: number) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="siri-shell min-h-[100dvh] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[1200px] flex-col">
        <header className="flex items-center justify-between py-1.5">
          <Link href="/" className="flex items-center gap-3" data-testid="link-admin-home">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))] text-xs font-bold tracking-[.18em] text-[hsl(var(--background))]">S</div>
            <div>
              <p className="text-[15px] font-bold tracking-[.08em] text-[hsl(var(--foreground))]">SIRI <span className="font-mono text-[10px] font-normal tracking-[.22em] text-[hsl(var(--accent))]">WORLDWIDE</span></p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Floor 2 · admin access</p>
            </div>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--foreground))]" data-testid="link-return-chat">
            <ArrowLeft className="h-3.5 w-3.5" /> Return to chat
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
        <footer className="flex items-center justify-between px-1 py-4 text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
          <span>Private by design</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" /> Restricted channel</span>
        </footer>
      </div>
    </main>
  );
}

function SetupState() {
  return (
    <AuthFrame>
      <section className="w-full max-w-lg rounded-[1.75rem] border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--card)/.9)] p-7 shadow-[var(--shadow-md)] sm:p-10" data-testid="state-firebase-setup">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]"><WifiOff className="h-6 w-6" /></div>
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent))]">Setup required</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Firebase is not connected.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Add the Firebase web configuration to this frontend before using Floor 2. Email/password sign-in is unavailable until the project credentials are present.</p>
        <div className="mt-6 space-y-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)] p-4 font-mono text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          <p>VITE_FIREBASE_API_KEY</p>
          <p>VITE_FIREBASE_AUTH_DOMAIN</p>
          <p>VITE_FIREBASE_PROJECT_ID</p>
          <p>VITE_FIREBASE_APP_ID</p>
        </div>
      </section>
    </AuthFrame>
  );
}

function SignInCard({
  gate,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onSignOut,
  error,
}: {
  gate: GateState;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  error: string;
}) {
  const busy = gate === 'signing-in' || gate === 'verifying';
  return (
    <section className="w-full max-w-lg rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.9)] p-7 shadow-[var(--shadow-md)] sm:p-10" data-testid="card-admin-signin">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><KeyRound className="h-6 w-6" /></div>
        <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Email protected</span>
      </div>
      <p className="mt-7 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Floor 2 / restricted</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Sign in to the archive.</h1>
      <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Use the authorized admin email and password to review the private conversation.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="admin-email" className="block text-xs font-semibold text-[hsl(var(--foreground))]">Admin email</label>
          <input id="admin-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="admin@example.com" className="mt-2 h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.65)] px-4 text-sm outline-none transition placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--primary)/.7)] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" data-testid="input-admin-email" />
        </div>
        <div>
          <label htmlFor="admin-password" className="block text-xs font-semibold text-[hsl(var(--foreground))]">Password</label>
          <input id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Enter your password" className="mt-2 h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.65)] px-4 text-sm outline-none transition placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--primary)/.7)] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]" data-testid="input-admin-password" />
        </div>
        <button type="submit" disabled={busy || !email.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-admin-signin">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {gate === 'signing-in' ? 'Signing in…' : 'Sign in securely'}
        </button>
      </form>

      {error && <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-3 text-xs leading-relaxed text-[hsl(var(--destructive))]" role="alert" data-testid="status-admin-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span></div>}
      <button type="button" onClick={onSignOut} className="mt-4 w-full py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]" data-testid="button-clear-admin-login">Clear login</button>
    </section>
  );
}

function AdminData({ onSignOut }: { onSignOut: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const hydrate = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setMessages(await loadMessages());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'SIRI could not load the archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrate();
  }, []);

  const handleDelete = async (message: Message) => {
    if (!window.confirm(`Delete this message from ${message.senderName}?`)) return;
    setDeletingId(message.id);
    const previous = messages;
    setMessages((current) => current.filter((item) => item.id !== message.id));
    try {
      await deleteMessage(message.id);
    } catch (error) {
      setMessages(previous);
      setLoadError(error instanceof Error ? error.message : 'This message could not be deleted.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <main className="siri-shell min-h-[100dvh] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="flex flex-wrap items-center justify-between gap-4 py-1.5">
          <Link href="/" className="flex items-center gap-3" data-testid="link-dashboard-home">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))] text-xs font-bold tracking-[.18em] text-[hsl(var(--background))]">S</div>
            <div><p className="text-[15px] font-bold tracking-[.08em] text-[hsl(var(--foreground))]">SIRI <span className="font-mono text-[10px] font-normal tracking-[.22em] text-[hsl(var(--accent))]">WORLDWIDE</span></p><p className="text-[11px] text-[hsl(var(--muted-foreground))]">Floor 2 · admin console</p></div>
          </Link>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--destructive)/.5)] hover:text-[hsl(var(--destructive))]" data-testid="button-admin-signout"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] shadow-[var(--shadow-md)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[hsl(var(--border))] px-5 py-5 sm:px-7">
              <div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Message archive</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Across the water</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Every note from the shared conversation.</p></div>
              <div className="rounded-xl bg-[hsl(var(--primary)/.1)] px-3 py-2 text-right"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Records</p><p className="mt-0.5 text-lg font-semibold text-[hsl(var(--primary))]" data-testid="text-message-count">{messages.length}</p></div>
            </div>
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="space-y-3" aria-label="Loading message archive" data-testid="state-admin-loading">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}</div>
              ) : loadError ? (
                <div className="flex flex-col items-center rounded-2xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] px-6 py-9 text-center" role="alert" data-testid="state-admin-error"><AlertCircle className="h-7 w-7 text-[hsl(var(--destructive))]" /><p className="mt-3 text-sm font-semibold">The archive could not be opened.</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{loadError}</p><button type="button" onClick={() => void hydrate()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--background))]" data-testid="button-retry-admin"><RefreshCw className="h-3.5 w-3.5" /> Try again</button></div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-6 text-center" data-testid="state-admin-empty"><MessageSquareText className="h-8 w-8 text-[hsl(var(--muted-foreground))]" /><p className="mt-4 text-sm font-semibold">No messages yet.</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">New conversation notes will appear here.</p></div>
              ) : (
                <div className="space-y-3" data-testid="list-admin-messages">
                  {[...messages].sort((a, b) => b.createdAt - a.createdAt).map((message) => {
                    const user = USERS.find((item) => item.id === message.senderId) ?? USERS[0];
                    return <article key={message.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.35)] p-4 transition hover:border-[hsl(var(--primary)/.35)]" data-testid={`row-admin-message-${message.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[10px] font-bold text-[hsl(var(--accent-foreground))]">{user.initials}</div>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-semibold">{message.senderName}</p><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{user.location}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]">{message.text}</p>{message.translatedText && <p className="mt-3 border-l-2 border-[hsl(var(--primary)/.5)] pl-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{message.translatedText}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {formatAdminDate(message.createdAt)}</span><span className="font-mono uppercase tracking-[.12em]">{message.language === 'en' ? 'English' : 'Kiswahili'}</span></div></div>
                        <button type="button" disabled={deletingId === message.id} onClick={() => void handleDelete(message)} className="rounded-xl p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))] disabled:cursor-wait disabled:opacity-50" aria-label={`Delete message from ${message.senderName}`} data-testid={`button-delete-message-${message.id}`}>{deletingId === message.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                      </div>
                    </article>;
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] shadow-[var(--shadow-md)]"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.55)]">Conversation users</p><Users className="h-4 w-4 text-[hsl(var(--sidebar-primary))]" /></div><div className="mt-5 space-y-3">{USERS.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.65)] p-3" data-testid={`card-admin-user-${user.id}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--accent-foreground))]">{user.initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="mt-0.5 truncate text-[11px] text-[hsl(var(--sidebar-foreground)/.55)]">{user.role} · {user.location}</p></div></div>)}</div></section>
             <section className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] p-5"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Access note</p><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">This view is protected by Firebase email/password authentication and the server admin gate.</p><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]"><ShieldCheck className="h-4 w-4" /> Admin verified</div></section>
          </aside>
        </section>
        <footer className="flex items-center justify-between px-1 py-4 text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]"><span>Private by design</span><span>Floor 2</span></footer>
      </div>
    </main>
  );
}

export default function Admin() {
  const [gate, setGate] = useState<GateState>(() => isFirebaseAuthConfigured() ? 'checking' : 'config');
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const authRef = useRef<Auth | null>(null);
  const verifiedEmailRef = useRef('');
  const verifyAdmin = useVerifyAdmin();
  const verifyAdminRef = useRef(verifyAdmin.mutateAsync);
  verifyAdminRef.current = verifyAdmin.mutateAsync;

  useEffect(() => {
    const auth = getFirebaseAuth();
    authRef.current = auth;
    if (!auth) {
      setGate('config');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setGate((current) => current === 'denied' ? current : 'signed-out');
        return;
      }
       const userEmail = user.email?.trim().toLowerCase();
       if (!userEmail || verifiedEmailRef.current === userEmail) return;
       verifiedEmailRef.current = userEmail;
       setEmail(user.email ?? '');
      setGate('verifying');
       void verifyAdminRef.current({ data: { email: userEmail } }).then((access) => {
        if (access.authorized) {
          setError('');
          setGate('authorized');
          return;
        }
        setGate('denied');
        setError('Access denied - Admin only');
        void signOut(auth);
      }).catch(() => {
        setGate('error');
        setError('Admin verification could not be completed. Try again.');
        void signOut(auth);
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const resetAuth = () => {
    setPassword('');
    setError('');
    verifiedEmailRef.current = '';
    setAuthUser(null);
    setGate(authRef.current ? 'signed-out' : 'config');
  };

  const handleSignOut = () => {
    if (authRef.current) void signOut(authRef.current);
    resetAuth();
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authRef.current || !email.trim() || !password) return;
    setError('');
    setGate('signing-in');
    try {
      await signInWithEmailAndPassword(authRef.current, email.trim(), password);
      setPassword('');
    } catch (submitError) {
      setGate('signed-out');
      setError(submitError instanceof Error ? 'The email or password is incorrect.' : 'The sign-in could not be completed. Try again.');
    }
  };

  if (gate === 'config') return <SetupState />;
  if (gate === 'authorized' && authUser) return <AdminData onSignOut={handleSignOut} />;
  if (gate === 'denied') {
    return <AuthFrame><section className="w-full max-w-lg rounded-[1.75rem] border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--card)/.9)] p-7 text-center shadow-[var(--shadow-md)] sm:p-10"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"><LockKeyhole className="h-6 w-6" /></div><h1 className="mt-6 text-2xl font-semibold">Access denied - Admin only</h1><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">This email address is not authorized for Floor 2.</p><button type="button" onClick={resetAuth} className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] px-5 text-xs font-bold text-[hsl(var(--background))]" data-testid="button-denied-retry">Try another email</button></section></AuthFrame>;
  }
  if (gate === 'checking' || gate === 'verifying') return <AuthFrame><div className="flex flex-col items-center text-center" role="status" data-testid="state-admin-checking"><LoaderCircle className="h-7 w-7 animate-spin text-[hsl(var(--primary))]" /><p className="mt-4 text-sm font-semibold">Checking your secure session…</p></div></AuthFrame>;
  return <AuthFrame><SignInCard gate={gate} email={email} setEmail={setEmail} password={password} setPassword={setPassword} onSubmit={(event) => void handleEmailSubmit(event)} onSignOut={handleSignOut} error={error} /></AuthFrame>;
}