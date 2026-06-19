(async () => {
  const m = await import('./src/lib/auth-engine.ts');
  console.log('module keys', Object.keys(m));
  console.log('authorizeRequest', m.authorizeRequest);
  console.log('default keys', m.default && Object.keys(m.default));
  console.log('default authorizeRequest', m.default?.authorizeRequest);
})();
