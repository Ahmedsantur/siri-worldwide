export type Message = {
  id: string;
  text: string;
  translatedText: string;
  language: 'en' | 'sw';
  senderId: string;
  senderName: string;
  createdAt: number;
  translatedAt?: number;
  isRead: boolean;
};

const STORAGE_KEY = 'siri-worldwide-messages-v1';
const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const hasFirebase = Boolean(firebaseProjectId);

const localSeed: Message[] = [
  {
    id: 'seed-1',
    text: 'Mambo Amina — are you awake?',
    translatedText: 'Mambo Amina — umeamka?',
    language: 'en',
    senderId: 'marcus',
    senderName: 'Marcus Reed',
    createdAt: Date.now() - 1000 * 60 * 23,
    translatedAt: Date.now() - 1000 * 60 * 22,
    isRead: true,
  },
  {
    id: 'seed-2',
    text: 'Nimeamka. The city is still quiet here.',
    translatedText: 'I am awake. The city is still quiet here.',
    language: 'sw',
    senderId: 'amina',
    senderName: 'Amina Otieno',
    createdAt: Date.now() - 1000 * 60 * 19,
    translatedAt: Date.now() - 1000 * 60 * 18,
    isRead: true,
  },
  {
    id: 'seed-3',
    text: 'Same sky, different morning. Tell me what you see.',
    translatedText: 'Anga moja, asubuhi tofauti. Niambie unaona nini.',
    language: 'en',
    senderId: 'marcus',
    senderName: 'Marcus Reed',
    createdAt: Date.now() - 1000 * 60 * 14,
    translatedAt: Date.now() - 1000 * 60 * 13,
    isRead: true,
  },
];

function fromFirestoreFields(fields: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }>): Message {
  return {
    id: fields.id?.stringValue ?? crypto.randomUUID(),
    text: fields.text?.stringValue ?? '',
    translatedText: fields.translatedText?.stringValue ?? '',
    language: fields.language?.stringValue === 'sw' ? 'sw' : 'en',
    senderId: fields.senderId?.stringValue ?? '',
    senderName: fields.senderName?.stringValue ?? '',
    createdAt: Number(fields.createdAt?.integerValue ?? Date.now()),
    translatedAt: fields.translatedAt?.integerValue ? Number(fields.translatedAt.integerValue) : undefined,
    isRead: Boolean(fields.isRead?.booleanValue),
  };
}

function firestoreUrl(id?: string) {
  const collection = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/siriMessages`;
  return id ? `${collection}/${encodeURIComponent(id)}` : collection;
}

function toFirestoreFields(message: Message) {
  return {
    fields: {
      id: { stringValue: message.id },
      text: { stringValue: message.text },
      translatedText: { stringValue: message.translatedText },
      language: { stringValue: message.language },
      senderId: { stringValue: message.senderId },
      senderName: { stringValue: message.senderName },
      createdAt: { integerValue: String(message.createdAt) },
      ...(message.translatedAt ? { translatedAt: { integerValue: String(message.translatedAt) } } : {}),
      isRead: { booleanValue: message.isRead },
    },
  };
}

function withApiKey(url: string) {
  return firebaseApiKey ? `${url}?key=${encodeURIComponent(firebaseApiKey)}` : url;
}

export function isFirebaseConfigured() {
  return hasFirebase;
}

export async function loadMessages(): Promise<Message[]> {
  if (!hasFirebase) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Message[];
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localSeed));
    return localSeed;
  }

  const response = await fetch(withApiKey(firestoreUrl()));
  if (!response.ok) throw new Error('SIRI could not connect to Firestore.');
  const payload = await response.json() as { documents?: Array<{ fields?: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }> }> };
  return (payload.documents ?? []).map((document) => fromFirestoreFields(document.fields ?? {})).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMessage(message: Message): Promise<void> {
  if (!hasFirebase) {
    const existing = await loadMessages();
    const next = [...existing.filter((item) => item.id !== message.id), message].sort((a, b) => a.createdAt - b.createdAt);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return;
  }
  const response = await fetch(withApiKey(firestoreUrl(message.id)), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreFields(message)),
  });
  if (!response.ok) throw new Error('SIRI could not save this message.');
}

export async function markMessagesRead(messages: Message[]): Promise<void> {
  const unread = messages.filter((message) => !message.isRead);
  if (!unread.length) return;
  const readMessages = messages.map((message) => message.isRead ? message : { ...message, isRead: true });
  if (!hasFirebase) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readMessages));
    return;
  }
  await Promise.all(unread.map((message) => saveMessage({ ...message, isRead: true })));
}