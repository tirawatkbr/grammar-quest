// Optional automatic sync with Firebase (Google sign-in + Firestore).
// Disabled unless js/firebase-config.js exports a config object. SDK is loaded from gstatic only then.
import { FIREBASE_CONFIG } from "./firebase-config.js";
import { getState, replaceState, subscribe } from "./store.js";
import { mergeStates } from "./merge.js";

const V = "10.14.1";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
let api = null; // { auth, db, fns }
let user = null;
let lastSync = 0;
let pushTimer = null;
const listeners = new Set();

export function status() {
  return { configured: Boolean(FIREBASE_CONFIG), user, lastSync };
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const l of listeners) l(status());
}

async function load() {
  if (api || !FIREBASE_CONFIG) return api;
  const [appM, authM, fsM] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);
  const db = fsM.getFirestore(app);
  api = { auth, db, authM, fsM };
  authM.onAuthStateChanged(auth, async (u) => {
    user = u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
    emit();
    if (user) await syncNow();
  });
  try {
    await authM.getRedirectResult(auth);
  } catch {
    /* ignore */
  }
  return api;
}

export async function init() {
  if (!FIREBASE_CONFIG) return;
  try {
    await load();
  } catch (e) {
    console.warn("Firebase unavailable (offline?)", e);
    return;
  }
  // push after local changes (debounced)
  subscribe(() => pushSoon());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && user) syncNow();
  });
  window.addEventListener("online", () => user && syncNow());
}

export async function signIn() {
  const a = await load();
  if (!a) throw new Error("ยังไม่ได้ตั้งค่า Firebase");
  const provider = new a.authM.GoogleAuthProvider();
  try {
    await a.authM.signInWithPopup(a.auth, provider);
  } catch (e) {
    // popup blocked (common on mobile) → redirect flow
    if (String(e?.code || "").includes("popup")) await a.authM.signInWithRedirect(a.auth, provider);
    else throw e;
  }
}

export async function signOut() {
  if (!api) return;
  await api.authM.signOut(api.auth);
}

function docRef() {
  return api.fsM.doc(api.db, "users", user.uid, "progress", "main");
}

let syncing = false;
let applyingRemote = false;

/** Pull remote, merge with local, write merged back. */
export async function syncNow() {
  if (!api || !user || syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const snap = await api.fsM.getDoc(docRef());
    const remote = snap.exists() ? JSON.parse(snap.data().state || "null") : null;
    const merged = remote ? mergeStates(getState(), remote) : getState();
    applyingRemote = true;
    replaceState(merged);
    applyingRemote = false;
    const { settings, ...rest } = merged;
    await api.fsM.setDoc(docRef(), { state: JSON.stringify(rest), updatedAt: Date.now() });
    lastSync = Date.now();
    emit();
  } catch (e) {
    console.warn("sync failed", e);
  } finally {
    applyingRemote = false;
    syncing = false;
  }
}

export function pushSoon() {
  if (!api || !user || applyingRemote) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 3000);
}
