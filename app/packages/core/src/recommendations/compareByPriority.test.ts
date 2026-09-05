import { describe, expect, it } from 'vitest';
import { compareByPriorityDesc } from './compareByPriority';

describe('compareByPriorityDesc', () => {
  it('orders higher priority first without reading copy', () => {
    const items = [
      { priority: 10, title: 'zzz' },
      { priority: 90, title: 'aaa' },
      { priority: 40, title: 'mmm' },
    ];

    const ordered = [...items].sort(compareByPriorityDesc);
    expect(ordered.map(item => item.priority)).toEqual([90, 40, 10]);
  });
});
