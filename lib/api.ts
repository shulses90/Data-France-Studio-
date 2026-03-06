export interface Dataset {
  id: string;
  title: string;
  description: string;
  organization?: {
    name: string;
    logo?: string;
  };
  resources: Resource[];
}

export interface Resource {
  id: string;
  title: string;
  format: string | null;
  url: string;
}

export async function searchDatasets(query: string): Promise<Dataset[]> {
  const res = await fetch(`https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  const data = await res.json();
  return data.data || [];
}

export async function getDataset(id: string): Promise<Dataset> {
  const res = await fetch(`https://www.data.gouv.fr/api/1/datasets/${id}/`);
  if (!res.ok) throw new Error('Failed to fetch dataset');
  return res.json() as Promise<Dataset>;
}
