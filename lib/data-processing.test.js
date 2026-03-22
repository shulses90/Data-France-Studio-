
function processData(
  data,
  filters,
  aggregate,
  xAxisKey,
  yAxisKey
) {
  let processed = [...data];

  // 1. Apply Filters
  if (filters && filters.length > 0) {
    processed = processed.filter(row => {
      return filters.every(f => {
        const val = row[f.column];
        if (val === undefined || val === null) return false;

        const strVal = String(val).toLowerCase().trim();
        const strFilterVal = String(f.value).toLowerCase().trim();

        // Handle French number formats for comparison
        const cleanNum = (v) => {
          if (typeof v === 'number') return v;
          if (typeof v !== 'string') return NaN;
          return Number(v.replace(/\s/g, '').replace(',', '.'));
        };

        const numVal = cleanNum(val);
        const numFilterVal = cleanNum(f.value);

        switch (f.operator) {
          case 'eq':
            return strVal === strFilterVal || (!isNaN(numVal) && !isNaN(numFilterVal) && numVal === numFilterVal);
          case 'contains':
            return strVal.includes(strFilterVal);
          case 'gt':
            return !isNaN(numVal) && !isNaN(numFilterVal) && numVal > numFilterVal;
          case 'lt':
            return !isNaN(numVal) && !isNaN(numFilterVal) && numVal < numFilterVal;
          default:
            return true;
        }
      });
    });
  }

  // 2. Aggregate
  if (aggregate && aggregate !== 'none' && xAxisKey && yAxisKey) {
    const grouped = {};

    processed.forEach((row) => {
      const x = row[xAxisKey];

      // Clean the Y value (e.g., "1 000,50" -> 1000.50)
      let yRaw = row[yAxisKey];
      if (typeof yRaw === 'string') {
        yRaw = yRaw.replace(/\s/g, '').replace(',', '.');
      }
      const y = Number(yRaw) || 0;

      if (x === undefined || x === null) return;
      const xStr = String(x).trim();

      if (!grouped[xStr]) grouped[xStr] = { sum: 0, count: 0 };
      grouped[xStr].sum += y;
      grouped[xStr].count += 1;
    });

    processed = Object.keys(grouped).map(x => {
      const group = grouped[x];
      let yVal = 0;
      if (aggregate === 'sum') yVal = group.sum;
      if (aggregate === 'avg') yVal = group.sum / group.count;
      if (aggregate === 'count') yVal = group.count;

      return {
        [xAxisKey]: x,
        [yAxisKey]: Number(yVal.toFixed(2)) // Round to 2 decimals
      };
    });
  } else if (yAxisKey) {
    // Even if not aggregating, we MUST clean French number formats for the chart to work
    processed = processed.map(row => {
      let yRaw = row[yAxisKey];
      if (typeof yRaw === 'string') {
        yRaw = yRaw.replace(/\s/g, '').replace(',', '.');
      }
      return {
        ...row,
        [yAxisKey]: Number(yRaw) || 0
      };
    });
  }

  // Sort by X axis if it looks like a number or year
  if (xAxisKey && processed.length > 0) {
    const isNumericX = processed.every(row => !isNaN(Number(row[xAxisKey])));
    if (isNumericX) {
      processed.sort((a, b) => Number(a[xAxisKey]) - Number(b[xAxisKey]));
    }
  }

  return processed;
}

const assert = (condition, message) => {
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
  assert(sumResult.find(r => r.category === 'A').value === 30, 'Sum for A should be 30');
  assert(sumResult.find(r => r.category === 'B').value === 30, 'Sum for B should be 30');
  console.log('✅ Aggregation: sum passed');

  // Test Avg
  const avgResult = processData(testData, [], 'avg', 'category', 'value');
  assert(avgResult.find(r => r.category === 'A').value === 15, 'Avg for A should be 15');
  console.log('✅ Aggregation: avg passed');

  // Test Count
  const countResult = processData(testData, [], 'count', 'category', 'value');
  assert(countResult.find(r => r.category === 'A').value === 2, 'Count for A should be 2');
  console.log('✅ Aggregation: count passed');

  // --- French Number Formatting Tests ---

  const frenchData = [
    { date: '2023', val: '1 234,56' },
    { date: '2024', val: '2 000' },
  ];
  const frenchResult = processData(frenchData, [], 'sum', 'date', 'val');
  assert(frenchResult.find(r => r.date === '2023').val === 1234.56, 'French number 1 234,56 should be parsed');
  assert(frenchResult.find(r => r.date === '2024').val === 2000, 'French number 2 000 should be parsed');
  console.log('✅ French number formatting passed');

  // --- Edge Cases ---

  // Empty Data
  const emptyResult = processData([], [], 'sum', 'x', 'y');
  assert(emptyResult.length === 0, 'Empty data should return empty array');
  console.log('✅ Edge case: empty data passed');

  // Missing Keys
  const missingData = [{ x: 'A', y: 1 }, { x: 'B' }];
  const missingResult = processData(missingData, [], 'sum', 'x', 'y');
  assert(missingResult.find(r => r.x === 'B').y === 0, 'Missing Y should be treated as 0');
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
  console.error(error.message);
  process.exit(1);
}
