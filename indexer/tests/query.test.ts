import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyQuery, parseQuery } from '../src/query.ts';

describe('PostgREST query subset', () => {
  it('parses eq, order, limit, and offset', () => {
    const query = parseQuery(new URLSearchParams('asset=eq.Abc&limit=10&offset=2&order=created_at.desc'));
    assert.equal(query.limit, 10);
    assert.equal(query.offset, 2);
    assert.deepEqual(query.order, [{ field: 'created_at', dir: 'desc' }]);
    assert.deepEqual(query.filters, [{ field: 'asset', op: 'eq', value: 'Abc' }]);
  });

  it('parses or=(tag1.eq.x,tag2.eq.x) and custom field_gt params', () => {
    const query = parseQuery(new URLSearchParams('or=(tag1.eq.starred,tag2.eq.starred)&updated_at_gt=2020-01-01'));
    assert.equal(query.orGroups.length, 1);
    assert.equal(query.orGroups[0].length, 2);
    assert.deepEqual(query.filters[0], { field: 'updated_at', op: 'gt', value: '2020-01-01' });
  });

  it('applies filters, or-groups, order, and Prefer count', () => {
    const rows = [
      { asset: 'a', tag1: 'starred', tag2: null, score: 10, created_at: '2020-01-02' },
      { asset: 'b', tag1: null, tag2: 'starred', score: 90, created_at: '2020-01-03' },
      { asset: 'c', tag1: 'other', tag2: 'x', score: 50, created_at: '2020-01-01' },
    ];
    const query = parseQuery(
      new URLSearchParams('or=(tag1.eq.starred,tag2.eq.starred)&order=created_at.desc&limit=1'),
      'count=exact',
    );
    assert.equal(query.countExact, true);
    const result = applyQuery(rows, query);
    assert.equal(result.total, 2);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].asset, 'b');
  });
});
