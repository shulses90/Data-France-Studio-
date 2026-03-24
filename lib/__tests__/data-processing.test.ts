import { describe, it, expect } from 'vitest';
import { processData } from '../data-processing';

describe('processData', () => {
  const sampleData = [
    { annee: '2020', population: '67 000', ville: 'Paris' },
    { annee: '2021', population: '68 000', ville: 'Paris' },
    { annee: '2020', population: '1 000', ville: 'Lyon' },
    { annee: '2021', population: '1 100', ville: 'Lyon' },
  ];

  it('returns data unchanged when no filters or aggregation', () => {
    const result = processData([...sampleData]);
    expect(result).toHaveLength(4);
  });

  it('filters with eq operator', () => {
    const result = processData(
      [...sampleData],
      [{ column: 'ville', operator: 'eq', value: 'Paris' }]
    );
    expect(result).toHaveLength(2);
    expect(result.every((r: any) => r.ville === 'Paris')).toBe(true);
  });

  it('filters with contains operator', () => {
    const result = processData(
      [...sampleData],
      [{ column: 'ville', operator: 'contains', value: 'par' }]
    );
    expect(result).toHaveLength(2);
  });

  it('filters with gt operator on French numbers', () => {
    const result = processData(
      [...sampleData],
      [{ column: 'population', operator: 'gt', value: '10000' }]
    );
    expect(result).toHaveLength(2);
  });

  it('filters with lt operator', () => {
    const result = processData(
      [...sampleData],
      [{ column: 'population', operator: 'lt', value: '2000' }]
    );
    expect(result).toHaveLength(2);
  });

  it('aggregates with sum', () => {
    const result = processData(
      [...sampleData],
      undefined,
      'sum',
      'annee',
      'population'
    );
    expect(result).toHaveLength(2);
    const y2020 = result.find((r: any) => r.annee === '2020');
    expect(y2020.population).toBe(68000); // 67000 + 1000
  });

  it('aggregates with avg', () => {
    const result = processData(
      [...sampleData],
      undefined,
      'avg',
      'annee',
      'population'
    );
    const y2020 = result.find((r: any) => r.annee === '2020');
    expect(y2020.population).toBe(34000); // (67000 + 1000) / 2
  });

  it('aggregates with count', () => {
    const result = processData(
      [...sampleData],
      undefined,
      'count',
      'annee',
      'population'
    );
    const y2020 = result.find((r: any) => r.annee === '2020');
    expect(y2020.population).toBe(2);
  });

  it('cleans French number formats without aggregation', () => {
    const result = processData(
      [{ x: 'a', val: '1 000,50' }],
      undefined,
      undefined,
      undefined,
      'val'
    );
    expect(result[0].val).toBe(1000.5);
  });

  it('sorts numeric X axis ascending', () => {
    const data = [
      { year: '2022', v: 3 },
      { year: '2020', v: 1 },
      { year: '2021', v: 2 },
    ];
    const result = processData(data, undefined, undefined, 'year');
    expect(result.map((r: any) => r.year)).toEqual(['2020', '2021', '2022']);
  });

  it('combines filters and aggregation', () => {
    const result = processData(
      [...sampleData],
      [{ column: 'ville', operator: 'eq', value: 'Paris' }],
      'sum',
      'annee',
      'population'
    );
    expect(result).toHaveLength(2);
    const y2020 = result.find((r: any) => r.annee === '2020');
    expect(y2020.population).toBe(67000);
  });

  it('handles missing values in filters', () => {
    const data = [
      { a: 'x', b: null },
      { a: 'y', b: 'hello' },
    ];
    const result = processData(data, [{ column: 'b', operator: 'contains', value: 'hello' }]);
    expect(result).toHaveLength(1);
  });
});
