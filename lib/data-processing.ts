export type FilterOperator = 'eq' | 'contains' | 'gt' | 'lt';

export interface Filter {
  column: string;
  operator: FilterOperator;
  value: string | number;
}

export function processData(
  data: any[],
  filters?: Filter[],
  aggregate?: 'sum' | 'avg' | 'count' | 'none',
  xAxisKey?: string,
  yAxisKey?: string
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
        const cleanNum = (v: any) => {
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
    const grouped: Record<string, { sum: number, count: number }> = {};

    processed.forEach((row: any) => {
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
