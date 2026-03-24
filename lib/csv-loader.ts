import Papa from 'papaparse';

const MAX_BYTES = 5_000_000; // 5MB

export interface CsvResult {
  data: any[];
  headers: string[];
}

export async function loadCsvFromProxy(csvUrl: string): Promise<CsvResult> {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(csvUrl)}`);
  if (!res.ok) throw new Error('Impossible de charger le fichier CSV.');

  const reader = res.body?.getReader();
  let text = '';
  if (reader) {
    let bytesRead = 0;
    while (bytesRead < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        text += new TextDecoder().decode(value, { stream: true });
        bytesRead += value.length;
      }
    }
    reader.cancel();
  } else {
    text = await res.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Impossible de parser les données CSV.'));
          return;
        }
        resolve({
          data: results.data,
          headers: results.meta.fields || [],
        });
      },
      error: (error: any) => {
        reject(new Error(error.message));
      },
    });
  });
}
