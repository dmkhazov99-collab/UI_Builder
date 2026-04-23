/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECTS_API_URL?: string;
  readonly VITE_PROJECTS_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
