import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertCircle, Check, CheckCheck, Clock3, Globe2, Info, LoaderCircle, MessageCircle, RefreshCw, Send, Settings2, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InstallPrompt } from '@/components/install-prompt';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Link } from 'wouter';
import { isFirebaseConfigured, loadMessages, markMessagesRead, saveMessage, type Message } from '@/lib/siri-persistence';
import Admin from '@/pages/admin';

const queryClient = new QueryClient();

type User = {
  id: string;
  name: string;
  role: string;
  initials: string;
  language: 'en' | 'sw';
  location: string;
};

const USERS: User[] = [
  { id: 'marcus', name: 'Marcus Reed', role: 'English speaker', initials: 'MR', language: 'en', location: 'Brooklyn, New York' },
  { id: 'amina', name: 'Amina Otieno', role: 'Swahili speaker', initials: 'AO', language: 'sw', location: 'Nairobi, Kenya' },
];

const translationPairs: Array<[string, string]> = [
  ['hello', 'hujambo'],
  ['hi', 'habari'],
  ['good morning', 'habari za asubuhi'],
  ['good night', 'usiku mwema'],
  ['how are you', 'habari yako'],
  ['are you awake', 'umeamka'],
  ['i am awake', 'nimeamka'],
  ['thank you', 'asante'],
  ['please', 'tafadhali'],
  ['see you soon', 'tutaonana hivi karibuni'],
  ['i miss you', 'ninakukosa'],
  ['what do you see', 'unaona nini'],
  ['the city is still quiet here', 'mji bado umetulia hapa'],
  ['same sky', 'anga moja'],
];

function translateDemo(text: string, language: 'en' | 'sw') {
  const normalized = text.toLowerCase().trim();
  for (const [english, swahili] of translationPairs) {
    if (language === 'en' && normalized.includes(english)) {
      return text.replace(new RegExp(english, 'i'), swahili);
    }
    if (language === 'sw' && normalized.includes(swahili)) {
      return text.replace(new RegExp(swahili, 'i'), english);
    }
  }
  return language === 'en'
    ? `Tafsiri ya Kiswahili: ${text}`
    : `English translation: ${text}`;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

function formatDay(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  const classes = size === 'lg' ? 'h-14 w-14 text-base' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] font-bold tracking-tight text-[hsl(var(--accent-foreground))] ${classes}`} aria-label={`${user.name} avatar`}>
      {user.initials}
    </div>
  );
}

function ConnectionCard({ onClose }: { onClose: () => void }) {
  const connected = isFirebaseConfigured();
  return (
    <div className="absolute right-0 top-12 z-20 w-[min(330px,calc(100vw-32px))] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left shadow-[var(--shadow-md)] rise-in">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[hsl(var(--foreground))]">Connection setup</p>
          <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            {connected ? 'Messages are being synced to your Firebase Firestore project.' : 'Preview mode keeps your conversation in this browser until Firebase is configured.'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Close connection details" data-testid="button-close-connection">
          <Check className="h-4 w-4" />
        </button>
      </div>
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${connected ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent)/.12)] text-[hsl(var(--foreground))]'}`}>
        {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {connected ? 'Firebase Firestore connected' : 'Local demo mode · browser saved'}
      </div>
      {!connected && <p className="mt-3 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">Add VITE_FIREBASE_PROJECT_ID to connect this same conversation across devices.</p>}
    </div>
  );
}

function MessageRow({
  message,
  isMine,
  expanded,
  onToggleTranslation,
}: {
  message: Message;
  isMine: boolean;
  expanded: boolean;
  onToggleTranslation: (message: Message) => void;
}) {
  const sender = USERS.find((user) => user.id === message.senderId) ?? USERS[0];
  const content = expanded && message.translatedText ? message.translatedText : message.text;
  const isTranslated = expanded && Boolean(message.translatedText);
  const targetLanguage = message.language === 'en' ? 'Swahili' : 'English';
  return (
    <div className={`group flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'} rise-in`} data-testid={`message-row-${message.id}`}>
      {!isMine && <Avatar user={sender} size="sm" />}
      <div className={`flex max-w-[88%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && <span className="mb-1 ml-1 text-[11px] font-semibold tracking-wide text-[hsl(var(--muted-foreground))]">{message.senderName}</span>}
        <div className={`message-bubble relative rounded-[1.35rem] px-4 py-3 ${isMine ? 'mine bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'theirs border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]'}`}>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{content}</p>
          {isTranslated && <p className={`mt-2 border-t pt-2 text-[10px] font-semibold uppercase tracking-[.14em] ${isMine ? 'border-[hsl(var(--primary-foreground)/.2)] text-[hsl(var(--primary-foreground)/.7)]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>{targetLanguage} translation</p>}
        </div>
        <div className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] font-medium tracking-wide text-[hsl(var(--muted-foreground))] ${isMine ? 'flex-row-reverse' : ''}`}>
          <span>{formatTime(message.createdAt)}</span>
          {isMine && (message.isRead ? <span className="inline-flex items-center gap-1 text-[hsl(var(--primary))]" data-testid={`status-read-${message.id}`}><CheckCheck className="h-3 w-3" /> Read</span> : <span className="inline-flex items-center gap-1" data-testid={`status-sent-${message.id}`}><Clock3 className="h-3 w-3" /> Sent</span>)}
          <button
            type="button"
            onClick={() => onToggleTranslation(message)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${isTranslated ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`}
            aria-label={`${isTranslated ? 'Show original message' : `Translate message to ${targetLanguage}`}`}
            title={isTranslated ? 'Show original message' : `Translate to ${targetLanguage}`}
            data-testid={`button-translate-${message.id}`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>{isTranslated ? 'Original' : 'Translate'}</span>
          </button>
        </div>
      </div>
      {isMine && <Avatar user={sender} size="sm" />}
    </div>
  );
}

function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUserId, setActiveUserId] = useState('marcus');
  const [expandedTranslations, setExpandedTranslations] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeUser = USERS.find((user) => user.id === activeUserId) ?? USERS[0];
  const otherUser = USERS.find((user) => user.id !== activeUserId) ?? USERS[1];

  const groupedMessages = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);
    return sorted.reduce<Array<{ day: string; messages: Message[] }>>((groups, message) => {
      const day = formatDay(message.createdAt);
      const current = groups[groups.length - 1];
      if (!current || current.day !== day) groups.push({ day, messages: [message] });
      else current.messages.push(message);
      return groups;
    }, []);
  }, [messages]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 2600);
  };

  const hydrate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const loaded = await loadMessages();
      setMessages(loaded);
      if (loaded.length) await markMessagesRead(loaded.map((message) => message.senderId !== activeUserId ? { ...message, isRead: true } : message));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'SIRI could not load this conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const refreshInterval = window.setInterval(() => {
      void loadMessages()
        .then((nextMessages) => setMessages(nextMessages))
        .catch(() => {
          // Keep the current conversation visible during a transient network drop.
        });
    }, 5000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!messages.length) return;
    const unread = messages.filter((message) => message.senderId !== activeUserId && !message.isRead);
    if (!unread.length) return;
    const updated = messages.map((message) => unread.some((item) => item.id === message.id) ? { ...message, isRead: true } : message);
    setMessages(updated);
    void markMessagesRead(updated);
  }, [activeUserId]);

  const handleIdentityChange = (id: string) => {
    setActiveUserId(id);
    setExpandedTranslations(new Set());
    showFeedback(`Now speaking as ${USERS.find((user) => user.id === id)?.name}.`);
    textareaRef.current?.focus();
  };

  const handleToggleTranslation = async (message: Message) => {
    if (expandedTranslations.has(message.id)) {
      setExpandedTranslations((current) => {
        const next = new Set(current);
        next.delete(message.id);
        return next;
      });
      return;
    }
    let nextMessage = message;
    if (!message.translatedText) {
      nextMessage = { ...message, translatedText: translateDemo(message.text, message.language), translatedAt: Date.now() };
      setMessages((current) => current.map((item) => item.id === message.id ? nextMessage : item));
      try {
        await saveMessage(nextMessage);
      } catch {
        showFeedback('Translation is visible, but could not be synced.');
      }
    }
    setExpandedTranslations((current) => new Set(current).add(message.id));
    showFeedback(`${message.language === 'en' ? 'Swahili' : 'English'} translation ready.`);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    const message: Message = {
      id: crypto.randomUUID(),
      text,
      translatedText: '',
      language: activeUser.language,
      senderId: activeUser.id,
      senderName: activeUser.name,
      createdAt: Date.now(),
      isRead: false,
    };
    setDraft('');
    setMessages((current) => [...current, message]);
    setIsSending(true);
    try {
      await saveMessage(message);
      showFeedback('Message sent.');
      window.setTimeout(() => {
        setMessages((current) => current.map((item) => item.id === message.id ? { ...item, isRead: true } : item));
        void saveMessage({ ...message, isRead: true });
      }, 1000);
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      showFeedback(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <main className="siri-shell min-h-[100dvh] overflow-hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="relative flex items-center justify-between py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))] text-xs font-bold tracking-[.18em] text-[hsl(var(--background))]">S</div>
            <div>
              <p className="text-[15px] font-bold tracking-[.08em] text-[hsl(var(--foreground))]">SIRI <span className="font-mono text-[10px] font-normal tracking-[.22em] text-[hsl(var(--accent))]">WORLDWIDE</span></p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">two languages. one conversation.</p>
            </div>
          </div>
          <div className="relative">
             <div className="flex items-center gap-2">
               <Link href="/admin" className="hidden items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-sm)] transition hover:border-[hsl(var(--primary)/.4)] hover:text-[hsl(var(--foreground))] sm:inline-flex" data-testid="link-admin">Admin</Link>
               <button type="button" onClick={() => setShowConnectionDetails((current) => !current)} className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-sm)] transition hover:border-[hsl(var(--primary)/.4)] hover:text-[hsl(var(--foreground))]" aria-expanded={showConnectionDetails} data-testid="button-connection-status">
                 <span className={`h-2 w-2 rounded-full ${isFirebaseConfigured() ? 'bg-[hsl(var(--primary))] pulse-dot' : 'bg-[hsl(var(--accent))]'}`} />
                 <span className="hidden sm:inline">{isFirebaseConfigured() ? 'Firestore connected' : 'Local demo mode'}</span>
                 <Info className="h-3.5 w-3.5" />
               </button>
             </div>
            {showConnectionDetails && <ConnectionCard onClose={() => setShowConnectionDetails(false)} />}
          </div>
        </header>

        <section className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[285px_minmax(0,1fr)]">
          <aside className="quiet-grid rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] shadow-[var(--shadow-md)] lg:flex lg:flex-col">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.56)]">Conversation 01</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Across the water</h1>
              </div>
              <div className="rounded-xl bg-[hsl(var(--sidebar-accent))] p-2 text-[hsl(var(--sidebar-accent-foreground))]"><Globe2 className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 max-w-[220px] text-sm leading-relaxed text-[hsl(var(--sidebar-foreground)/.64)]">A private bridge between two places, two voices, and whatever today brings.</p>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.5)]">Speak as</p>
                <Settings2 className="h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground)/.45)]" />
              </div>
              <div className="space-y-2">
                {USERS.map((user) => {
                  const selected = user.id === activeUserId;
                  return (
                    <button type="button" key={user.id} onClick={() => handleIdentityChange(user.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? 'border-[hsl(var(--sidebar-primary)/.6)] bg-[hsl(var(--sidebar-primary)/.15)]' : 'border-transparent hover:bg-[hsl(var(--sidebar-accent))]'}`} aria-pressed={selected} data-testid={`button-identity-${user.id}`}>
                      <Avatar user={user} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{user.name}</span>
                        <span className="mt-0.5 block text-[11px] text-[hsl(var(--sidebar-foreground)/.54)]">{user.language === 'en' ? 'English' : 'Kiswahili'} · {user.location}</span>
                      </span>
                      {selected && <span className="h-2 w-2 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 hidden border-t border-[hsl(var(--sidebar-border))] pt-5 lg:block lg:flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.5)]">Translation key</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--sidebar-foreground)/.7)]">
                <span className="rounded-lg bg-[hsl(var(--sidebar-accent))] p-2"><Globe2 className="h-3.5 w-3.5" /></span>
                Press the globe on any message.
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-[hsl(var(--sidebar-border))] pt-4 text-[11px] text-[hsl(var(--sidebar-foreground)/.5)]">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--sidebar-primary))]" />
              Built for the in-between moments
            </div>
          </aside>

          <section className="flex min-h-[590px] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <Avatar user={otherUser} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--card))] bg-[hsl(var(--primary))]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[hsl(var(--foreground))]">{otherUser.name}</p>
                  <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{otherUser.location} · {otherUser.language === 'en' ? 'English' : 'Kiswahili'}</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-[hsl(var(--primary)/.09)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] pulse-dot" />
                Open channel
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] sm:hidden"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> Live</div>
            </div>

            <div className="chat-scroll quiet-grid min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {isLoading ? (
                <div className="space-y-5" aria-label="Loading conversation" data-testid="state-loading">
                  {[false, true, false].map((mine, index) => <div key={index} className={`flex items-end gap-3 ${mine ? 'justify-end' : ''}`}><div className="h-8 w-8 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /><div className={`h-16 animate-pulse rounded-3xl bg-[hsl(var(--muted))] ${mine ? 'w-48' : 'w-64'}`} /></div>)}
                </div>
              ) : error ? (
                <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] px-6 py-9 text-center" data-testid="state-error">
                  <AlertCircle className="h-8 w-8 text-[hsl(var(--destructive))]" />
                  <h2 className="mt-4 font-semibold">The channel is quiet</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{error}</p>
                  <button type="button" onClick={() => void hydrate()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--background))]" data-testid="button-retry-loading"><RefreshCw className="h-3.5 w-3.5" /> Try again</button>
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center" data-testid="state-empty">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><MessageCircle className="h-7 w-7" /></div>
                  <h2 className="mt-5 text-lg font-bold">Start across the distance</h2>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Say hello in {activeUser.language === 'en' ? 'English' : 'Kiswahili'}. SIRI will help carry it across.</p>
                  <button type="button" onClick={() => textareaRef.current?.focus()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-start-conversation"><Send className="h-3.5 w-3.5" /> Write the first note</button>
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-7">
                  {groupedMessages.map((group) => (
                    <div key={group.day}>
                      <div className="mb-5 flex items-center gap-3"><div className="h-px flex-1 bg-[hsl(var(--border))]" /><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">{group.day}</span><div className="h-px flex-1 bg-[hsl(var(--border))]" /></div>
                      <div className="space-y-5">
                        {group.messages.map((message) => <MessageRow key={message.id} message={message} isMine={message.senderId === activeUserId} expanded={expandedTranslations.has(message.id)} onToggleTranslation={(item) => void handleToggleTranslation(item)} />)}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.88)] p-3 sm:p-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Speaking as <span className="font-semibold text-[hsl(var(--foreground))]">{activeUser.name}</span> <span className="font-mono text-[10px] uppercase tracking-[.12em]">· {activeUser.language}</span></p>
                <p className="hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:block">Enter to send · Shift + Enter for a new line</p>
              </div>
              <form onSubmit={(event) => void handleSubmit(event)} className="flex items-end gap-2 rounded-[1.25rem] border border-[hsl(var(--border))] bg-[hsl(var(--background)/.7)] p-2 shadow-[var(--shadow-sm)] focus-within:border-[hsl(var(--primary)/.6)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.1)]">
                <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} rows={1} placeholder={`Write in ${activeUser.language === 'en' ? 'English' : 'Kiswahili'}...`} className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-[hsl(var(--muted-foreground)/.7)]" aria-label="Message text" data-testid="input-message" />
                <button type="submit" disabled={!draft.trim() || isSending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message" data-testid="button-send-message">
                  {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
              <div className="mt-2 flex min-h-4 items-center justify-center text-[11px] font-medium text-[hsl(var(--primary))]" aria-live="polite" data-testid="status-feedback">{feedback}</div>
            </div>
          </section>
        </section>
        <footer className="flex items-center justify-between px-1 py-4 text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
          <span>Private by design</span>
          <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3 w-3" /> {isFirebaseConfigured() ? 'Synced worldwide' : 'Demo data stays local'}</span>
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
         <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;