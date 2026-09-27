/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'on' in a `--mode mock` build; undefined otherwise, which is what lets
   *  Vite drop the mock worker from a normal build entirely. */
  readonly VITE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
