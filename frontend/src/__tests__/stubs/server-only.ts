// Stub vazio para o pacote `server-only` sob o Vitest (ambiente node). Em runtime
// o Next resolve o pacote real (no-op no servidor, erro se bundlado p/ o browser);
// nos testes só precisamos que o import não quebre.
export {};
