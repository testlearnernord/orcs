/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORTRAITS_VERSION?: string;
}

// Declare PNG files as modules that export strings (asset URLs)
declare module '*.png' {
  const value: string;
  export default value;
}
