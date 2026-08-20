/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string

  /** SHA-256 (hex) da senha do perfil "Pastoral do Dízimo" (login da Pastoral). */
  readonly VITE_SENHA_PASTORAL_DIZIMO_HASH?: string
  /** SHA-256 (hex) da senha do perfil "Coordenadora" (login da Pastoral e da Tesouraria). */
  readonly VITE_SENHA_COORDENADORA_HASH?: string
  /** SHA-256 (hex) da senha do perfil "Tesoureiro" (login da Pastoral e da Tesouraria). */
  readonly VITE_SENHA_TESOUREIRO_HASH?: string
  /** SHA-256 (hex) da senha do perfil "Secretaria Paroquial" (login da Tesouraria). */
  readonly VITE_SENHA_SECRETARIA_PAROQUIAL_HASH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
