import { describe, expect, it } from 'vitest';
import { DagreLayoutAdapter } from './dagreLayoutAdapter';

const sized = (ids: string[]) => ids.map(id => ({ id, width: 280, height: 120 }));
const links = (pairs: Array<[string, string]>) =>
  pairs.map(([source, target], i) => ({ id: `e${i}`, source, target }));

describe('DagreLayoutAdapter', () => {
  it('places a chain top-to-bottom', async () => {
    const adapter = new DagreLayoutAdapter();
    const positions = await adapter.computeLayout(
      sized(['a', 'b', 'c']),
      links([
        ['a', 'b'],
        ['b', 'c'],
      ])
    );

    expect(positions.size).toBe(3);
    expect(positions.get('a')!.y).toBeLessThan(positions.get('c')!.y);
  });

  it('spreads siblings so fan-in labels have horizontal room', async () => {
    const adapter = new DagreLayoutAdapter();
    const actors = ['architect', 'contributor', 'operator'];
    const positions = await adapter.computeLayout(
      sized([...actors, 'system']),
      actors.map((source, i) => ({
        id: `e${i}`,
        source,
        target: 'system',
        label: `Describe work for ${source} with a longer caption`,
      }))
    );

    const xs = actors.map(id => positions.get(id)!.x).sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeGreaterThan(150);
    expect(xs[2]! - xs[1]!).toBeGreaterThan(150);
  });

  it('centers a hub node above its children', async () => {
    const adapter = new DagreLayoutAdapter();
    const children = ['a', 'b', 'c', 'd', 'e'];
    const positions = await adapter.computeLayout(
      sized(['user', ...children]),
      links(children.map(child => ['user', child] as [string, string]))
    );

    const user = positions.get('user')!;
    const childXs = children.map(id => positions.get(id)!.x + 140);
    const childCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    expect(user.x + 140).toBeCloseTo(childCenter, 0);
  });
});
