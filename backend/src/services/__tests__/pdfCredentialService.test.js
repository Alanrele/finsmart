const { encryptCredential, decryptCredential } = require('../pdfCredentialService');

describe('pdfCredentialService (AES-256-GCM)', () => {
  const OLD = process.env.PDF_CRED_SECRET;
  beforeAll(() => { process.env.PDF_CRED_SECRET = 'clave-de-prueba-suficientemente-larga'; });
  afterAll(() => { process.env.PDF_CRED_SECRET = OLD; });

  test('cifra y descifra ida y vuelta', () => {
    const blob = encryptCredential('MiClaveDelPDF123');
    expect(blob.data).not.toContain('MiClaveDelPDF123'); // no texto plano
    expect(decryptCredential(blob)).toBe('MiClaveDelPDF123');
  });

  test('cada cifrado usa IV distinto (no determinístico en el ciphertext)', () => {
    const a = encryptCredential('misma-clave');
    const b = encryptCredential('misma-clave');
    expect(a.data).not.toBe(b.data);
    expect(decryptCredential(a)).toBe(decryptCredential(b));
  });

  test('un authTag manipulado hace fallar el descifrado', () => {
    const blob = encryptCredential('secreto');
    const tampered = { ...blob, data: Buffer.from('otro').toString('base64') };
    expect(() => decryptCredential(tampered)).toThrow();
  });

  test('rechaza credencial vacía', () => {
    expect(() => encryptCredential('')).toThrow();
  });
});
