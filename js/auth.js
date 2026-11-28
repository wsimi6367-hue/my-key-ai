// Comptes utilisateurs (Firebase Authentication + Firestore).
// Identifiant : e-mail, ou numéro de téléphone ivoirien. Un numéro est transformé en adresse
// technique « 2250700000000@tel.mykeyai.app » pour utiliser la connexion par mot de passe de Firebase.
// Profil enregistré dans Firestore : users/{uid} = { prenom, nom, commune, identifiant, type, chat, createdAt, updatedAt }.
import { FIREBASE_CONFIG } from "./firebase-config.js";

const V = "10.14.1";
const PHONE_DOMAIN = "tel.mykeyai.app";
let fb = null; // { auth, db, m: modules }

export const authEnabled = () => !!FIREBASE_CONFIG;

async function load() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const a = app.initializeApp(FIREBASE_CONFIG);
  const au = auth.getAuth(a);
  au.languageCode = "fr";
  try { await auth.setPersistence(au, auth.browserLocalPersistence); } catch {}
  fb = { auth: au, db: fs.getFirestore(a), A: auth, F: fs };
  return fb;
}

function fail(msg) { const e = new Error(msg); e.userMessage = msg; return e; }

// « jean@mail.com » -> e-mail ; « 07 00 00 00 00 », « +225 07… » -> téléphone.
export function parseIdentifier(raw) {
  const v = String(raw || "").trim();
  if (v.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw fail("Adresse e-mail invalide.");
    return { type: "email", value: v.toLowerCase(), email: v.toLowerCase() };
  }
  let d = v.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10) d = "225" + d;
  if (!/^\d{11,15}$/.test(d)) throw fail("Numéro de téléphone invalide. Exemple : 07 00 00 00 00.");
  return { type: "tel", value: "+" + d, email: `${d}@${PHONE_DOMAIN}` };
}

const ERR = {
  "auth/email-already-in-use": "Un compte existe déjà avec cet identifiant. Connectez-vous.",
  "auth/invalid-credential": "Identifiant ou mot de passe incorrect.",
  "auth/wrong-password": "Identifiant ou mot de passe incorrect.",
  "auth/user-not-found": "Aucun compte avec cet identifiant. Créez un compte.",
  "auth/weak-password": "Mot de passe trop court : 6 caractères minimum.",
  "auth/too-many-requests": "Trop d'essais. Patientez quelques minutes puis réessayez.",
  "auth/network-request-failed": "Pas de connexion internet. Réessayez.",
  "auth/invalid-email": "Identifiant invalide.",
  "auth/requires-recent-login": "Pour votre sécurité, déconnectez-vous puis reconnectez-vous, et recommencez.",
};
const wrap = (e) => (e.userMessage ? e : fail(ERR[e.code] || "Une erreur est survenue. Réessayez."));

export async function watchUser(cb) {
  if (!authEnabled()) return cb(null);
  try {
    const { auth, A } = await load();
    A.onAuthStateChanged(auth, async (u) => cb(u ? await getProfile(u) : null));
  } catch { cb(null); }
}

async function getProfile(u) {
  const { db, F } = await load();
  let p = {};
  try { const snap = await F.getDoc(F.doc(db, "users", u.uid)); if (snap.exists()) p = snap.data(); } catch {}
  return { uid: u.uid, ...p };
}

export async function signUp({ identifiant, password, prenom, nom, commune }) {
  const id = parseIdentifier(identifiant);
  if (!prenom?.trim() || !nom?.trim()) throw fail("Indiquez votre prénom et votre nom.");
  if (String(password || "").length < 6) throw fail("Mot de passe trop court : 6 caractères minimum.");
  try {
    const { auth, db, A, F } = await load();
    const cred = await A.createUserWithEmailAndPassword(auth, id.email, password);
    try { await A.updateProfile(cred.user, { displayName: `${prenom.trim()} ${nom.trim()}` }); } catch {}
    const profile = { prenom: prenom.trim(), nom: nom.trim(), commune: commune || "", identifiant: id.value, type: id.type,
      createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() };
    await F.setDoc(F.doc(db, "users", cred.user.uid), profile);
    return { uid: cred.user.uid, ...profile };
  } catch (e) { throw wrap(e); }
}

export async function signIn({ identifiant, password }) {
  const id = parseIdentifier(identifiant);
  try {
    const { auth, A } = await load();
    const cred = await A.signInWithEmailAndPassword(auth, id.email, password);
    return getProfile(cred.user);
  } catch (e) { throw wrap(e); }
}

export async function signOutUser() {
  if (!fb) return;
  try { await fb.A.signOut(fb.auth); } catch {}
}

export async function resetPassword(identifiant) {
  const id = parseIdentifier(identifiant);
  if (id.type !== "email") throw fail("La réinitialisation par e-mail n'est possible que pour les comptes créés avec un e-mail. Pour un compte par téléphone, contactez-nous.");
  try { const { auth, A } = await load(); await A.sendPasswordResetEmail(auth, id.email); }
  catch (e) { throw wrap(e); }
}

// Conversations du compte : users/{uid}/conversations/{convId}
//   { title, updatedAt (ms), count, messages (JSON des 40 derniers messages) }
const slim = (m) => {
  const o = { role: m.role, content: String(m.content || "").slice(0, 4000) };
  if (Array.isArray(m.listings) && m.listings.length) o.listings = m.listings.slice(0, 6);
  return o;
};
export function convTitle(messages) {
  const first = (messages || []).find((m) => m.role === "user");
  const t = String(first?.content || "Conversation").replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}
const saveTimers = {};
export function saveConversation(uid, convId, messages) {
  if (!fb || !uid || !convId || !messages?.length) return;
  clearTimeout(saveTimers[convId]);
  saveTimers[convId] = setTimeout(async () => {
    try {
      const { db, F } = fb;
      let list = messages.slice(-40).map(slim);
      let json = JSON.stringify(list);
      while (json.length > 700000 && list.length > 2) { list = list.slice(2); json = JSON.stringify(list); }
      await F.setDoc(F.doc(db, "users", uid, "conversations", convId),
        { title: convTitle(messages), updatedAt: Date.now(), count: messages.length, messages: json });
    } catch {}
  }, 1000);
}
export async function listConversations(uid) {
  if (!fb || !uid) return [];
  const { db, F } = fb;
  const q = F.query(F.collection(db, "users", uid, "conversations"), F.orderBy("updatedAt", "desc"), F.limit(30));
  const snap = await F.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, title: d.data().title || "Conversation", updatedAt: d.data().updatedAt || 0, count: d.data().count || 0 }));
}
export async function getConversation(uid, convId) {
  const { db, F } = await load();
  const snap = await F.getDoc(F.doc(db, "users", uid, "conversations", convId));
  if (!snap.exists()) return null;
  try { return JSON.parse(snap.data().messages || "[]"); } catch { return []; }
}
export async function deleteConversation(uid, convId) {
  const { db, F } = await load();
  await F.deleteDoc(F.doc(db, "users", uid, "conversations", convId));
}

// Suppression définitive du compte (exigée par Google Play et l'App Store) :
// on redemande le mot de passe, on efface les conversations, la fiche, puis le compte lui-même.
export async function deleteAccount(password) {
  if (!String(password || "")) throw fail("Indiquez votre mot de passe pour confirmer.");
  try {
    const { auth, db, A, F } = await load();
    const user = auth.currentUser;
    if (!user) throw fail("Vous n'êtes plus connecté. Reconnectez-vous puis recommencez.");
    await A.reauthenticateWithCredential(user, A.EmailAuthProvider.credential(user.email, password));
    const convs = await F.getDocs(F.collection(db, "users", user.uid, "conversations"));
    await Promise.all(convs.docs.map((d) => F.deleteDoc(d.ref)));
    const ref = F.doc(db, "users", user.uid);
    // Si les anciennes règles Firestore interdisent encore la suppression, on vide la fiche.
    try { await F.deleteDoc(ref); } catch { await F.setDoc(ref, { supprime: true, updatedAt: F.serverTimestamp() }); }
    await A.deleteUser(user);
  } catch (e) { throw wrap(e); }
}
