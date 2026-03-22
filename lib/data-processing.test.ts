
import { processData } from './data-processing';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTests = () => {
  console.log('Running processData tests...');

  // --- Aggregation Tests ---

  const testData = [
    { category: 'A', value: 10 },
    { category: 'A', value: 20 },
    { category: 'B', value: 30 },
  ];

  // Test Sum
  const sumResult = processData(testData, [], 'sum', 'category', 'value');
  assert(sumResult.length === 2, 'Sum result should have 2 groups');
  assert(sumResult.find(r => r.category === 'A')?.value === 30, 'Sum for A should be 30');
  assert(sumResult.find(r => r.category === 'B')?.value === 30, 'Sum for B should be 30');
  console.log('✅ Aggregation: sum passed');

  // Test Avg
  const avgResult = processData(testData, [], 'avg', 'category', 'value');
  assert(avgResult.find(r => r.category === 'A')?.value === 15, 'Avg for A should be 15');
  console.log('✅ Aggregation: avg passed');

  // Test Count
  const countResult = processData(testData, [], 'count', 'category', 'value');
  assert(countResult.find(r => r.category === 'A')?.value === 2, 'Count for A should be 2');
  console.log('✅ Aggregation: count passed');

  // --- French Number Formatting Tests ---

  const frenchData = [
    { date: '2023', val: '1 234,56' },
    { date: '2024', val: '2 000' },
  ];
  const frenchResult = processData(frenchData, [], 'sum', 'date', 'val');
  assert(frenchResult.find(r => r.date === '2023')?.val === 1234.56, 'French number 1 234,56 should be parsed');
  assert(frenchResult.find(r => r.date === '2024')?.val === 2000, 'French number 2 000 should be parsed');
  console.log('✅ French number formatting passed');

  // --- Edge Cases ---

  // Empty Data
  const emptyResult = processData([], [], 'sum', 'x', 'y');
  assert(emptyResult.length === 0, 'Empty data should return empty array');
  console.log('✅ Edge case: empty data passed');

  // Missing Keys
  const missingData = [{ x: 'A', y: 1 }, { x: 'B' }];
  const missingResult = processData(missingData, [], 'sum', 'x', 'y');
  assert(missingResult.find(r => r.x === 'B')?.y === 0, 'Missing Y should be treated as 0');
  console.log('✅ Edge case: missing keys passed');

  // Null/Undefined X
  const nullXData = [{ x: 'A', y: 1 }, { x: null, y: 2 }, { y: 3 }];
  const nullXResult = processData(nullXData, [], 'sum', 'x', 'y');
  assert(nullXResult.length === 1 && nullXResult[0].x === 'A', 'Null or undefined X should be ignored in aggregation');
  console.log('✅ Edge case: null/undefined X ignored passed');

  // Sorting
  const unsortedData = [{ year: '2024', v: 1 }, { year: '2022', v: 2 }, { year: '2023', v: 3 }];
  const sortedResult = processData(unsortedData, [], 'sum', 'year', 'v');
  assert(sortedResult[0].year === '2022' && sortedResult[1].year === '2023' && sortedResult[2].year === '2024', 'Result should be sorted by numeric year');
  console.log('✅ Edge case: sorting passed');

  console.log('All tests passed successfully!');
};

try {
  runTests();
} catch (error) {
  console.error('❌ Test failed:');
  console.error(error);
  process.exit(1);
}
