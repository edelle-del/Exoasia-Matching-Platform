void (async () => {
  const m = await import('./src/lib/auth-engine.ts');
  console.log('module keys', Object.keys(m));
  console.log('authorizeRequest is', typeof m.authorizeRequest);
  console.log('default is', typeof m.default);
  console.log('default keys', m.default ? Object.keys(m.default) : null);
})();
