/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string

  /** Usuário do login da Pastoral (padrão: "dizimo"). */
  readonly VITE_ADMIN_USUARIO?: string
  /** SHA-256 (hex) da senha da Pastoral — opção recomendada. */
  readonly VITE_ADMIN_SENHA_HASH?: string
  /** Senha da Pastoral em texto puro — usada só se o hash não for informado. */
  readonly VITE_ADMIN_SENHA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
