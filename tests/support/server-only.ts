// `server-only` is resolved by the Next.js build, not by Vitest. Server modules
// that guard themselves with it still need to be unit-testable, so the import
// is aliased to this empty module.
export {};
