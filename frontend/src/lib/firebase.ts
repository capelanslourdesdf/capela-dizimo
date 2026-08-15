import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Este projeto usa exclusivamente o Cloud Firestore (plano gratuito/Spark) — nenhum outro
// produto do Firebase (Auth, Storage, Functions, Analytics etc.) é utilizado. Por isso o
// config abaixo traz só os dois campos que o Firestore realmente precisa.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const app = initializeApp(firebaseConfig)

// As regras do Firestore deste projeto são abertas (allow read, write: if true),
// então não precisamos de autenticação (nem anônima) para ler/gravar.
export const db = getFirestore(app)

export default app
