const fs = require('fs');
const path = require('path');
const { parseBcpEmailV2 } = require('../../../src/lib/email/bcp/parseBcpEmailV2');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  const filePath = path.join(FIXTURES_DIR, name);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

const fixtureFiles = fs
  .readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort();

const transactionalFixtures = fixtureFiles.filter((file) => {
  const fixture = loadFixture(file);
  return fixture.expect?.success !== false;
});

const rejectionFixtures = fixtureFiles.filter((file) => {
  const fixture = loadFixture(file);
  return fixture.expect?.success === false;
});

describe('parseBcpEmailV2 transactional fixtures', () => {
  test.each(transactionalFixtures)('%s', (fixtureName) => {
    const fixture = loadFixture(fixtureName);
    const payload = {
      subject: fixture.subject,
      html: fixture.html,
      text: fixture.text,
      receivedAt: fixture.receivedAt,
    };

    const result = parseBcpEmailV2(payload);

    expect(result.success).toBe(true);
    expect(result.transaction).toBeDefined();

    const tx = result.transaction;
    const expectations = fixture.expect || {};

    if (expectations.template) {
      expect(tx.template).toBe(expectations.template);
    }

    if (expectations.amount) {
      expect(tx.amount).toEqual(expectations.amount);
    }

    if (expectations.occurredAt) {
      expect(tx.occurredAt).toBe(expectations.occurredAt);
    }

    if (expectations.cardLast4) {
      expect(tx.cardLast4).toBe(expectations.cardLast4);
    }

    if (expectations.merchant) {
      expect(tx.merchant).toBe(expectations.merchant);
    }

    if (expectations.channel) {
      expect(tx.channel).toBe(expectations.channel);
    }

    if (expectations.location) {
      expect(tx.location).toBe(expectations.location);
    }

    if (expectations.operationId) {
      expect(tx.operationId).toBe(expectations.operationId);
    }

    if (expectations.accountRef) {
      expect(tx.accountRef).toBe(expectations.accountRef);
    }

    if (typeof expectations.confidence === 'number') {
      expect(tx.confidence).toBeGreaterThanOrEqual(expectations.confidence);
    }

    if (Array.isArray(expectations.notesContains) && expectations.notesContains.length > 0) {
      const notes = tx.notes || '';
      expectations.notesContains.forEach((snippet) => {
        expect(notes).toContain(snippet);
      });
    }
  });
});

describe('parseBcpEmailV2 rejection fixtures', () => {
  test.each(rejectionFixtures)('%s', (fixtureName) => {
    const fixture = loadFixture(fixtureName);
    const result = parseBcpEmailV2({
      subject: fixture.subject,
      html: fixture.html,
      text: fixture.text,
    });

    expect(result.success).toBe(false);
    const expectedReason = fixture.expect?.reason;
    if (expectedReason) {
      const notes = result.notes || [];
      const notesArray = Array.isArray(notes) ? notes : [notes];
      expect(notesArray.join('; ')).toContain(expectedReason);
    }
  });
});
