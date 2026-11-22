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

// Sauvegarde de la conversation dans le compte (pour la retrouver sur un autre appareil).
let saveTimer = null;
export function saveChat(uid, messages) {
  if (!fb || !uid) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const { db, F } = fb;
      const chat = JSON.stringify(messages.slice(-30));
      if (chat.length > 800000) return;
      await F.setDoc(F.doc(db, "users", uid), { chat, updatedAt: F.serverTimestamp() }, { merge: true });
    } catch {}
  }, 1200);
}
