import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_KEY = 'siri-worldwide-install-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      // Continue without persistence when storage is unavailable.
    }
    if (dismissed) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (isIosDevice()) setShowIosPrompt(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // The prompt can still be dismissed for this render.
    }
    setDeferredPrompt(null);
    setShowIosPrompt(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!deferredPrompt && !showIosPrompt) return null;

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--card)/.96)] p-4 shadow-[var(--shadow-md)] backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:w-[360px]"
      role="dialog"
      aria-label="Install SIRI Worldwide"
      data-testid="install-prompt"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
          {showIosPrompt && !deferredPrompt ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Keep SIRI close</p>
          {showIosPrompt && !deferredPrompt ? (
            <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Tap Share, then “Add to Home Screen” to install the app.</p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Install SIRI Worldwide for a faster, full-screen chat experience.</p>
          )}
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" aria-label="Dismiss install prompt" data-testid="button-dismiss-install">
          <X className="h-4 w-4" />
        </button>
      </div>
      {deferredPrompt && (
        <button type="button" onClick={() => void install()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-95" data-testid="button-install-app">
          <Download className="h-4 w-4" /> Add to home screen
        </button>
      )}
    </aside>
  );
}