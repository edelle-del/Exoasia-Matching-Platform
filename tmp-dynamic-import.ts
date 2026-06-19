void (async () => {
  const m = await import('./src/lib/auth-engine.ts');
  console.log('dynamic module keys', Object.keys(m));
  console.log('authorizeRequest', typeof m.authorizeRequest);
  console.log('default', typeof m.default);
  if (m.default) console.log('default keys', Object.keys(m.default));
})();
