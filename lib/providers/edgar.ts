export interface EdgarFiling {
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string | null;
  isAmendment: boolean;
}

function padCik(cik: string): string {
  return cik.padStart(10, '0');
}

function buildFilingUrl(cik: string, accession: string, primaryDoc: string | null): string {
  const cikInt = parseInt(cik, 10).toString();
  const accessionNoDashes = accession.replace(/-/g, '');
  const folderUrl = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accessionNoDashes}/`;
  if (primaryDoc) {
    return `${folderUrl}${primaryDoc}`;
  }
  return folderUrl;
}

export async function fetchEdgarSubmissions(cik: string): Promise<EdgarFiling[]> {
  const paddedCik = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  const userAgent = process.env.SEC_USER_AGENT || 'PortfolioWatchman/1.0 contact@example.com';

  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`EDGAR fetch failed for CIK ${cik}: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const recent = data.filings?.recent;
  if (!recent) return [];

  const filings: EdgarFiling[] = [];
  const count = recent.accessionNumber?.length ?? 0;

  for (let i = 0; i < count; i++) {
    const form = recent.form?.[i] ?? '';
    filings.push({
      form,
      filingDate: recent.filingDate?.[i] ?? '',
      accessionNumber: recent.accessionNumber?.[i] ?? '',
      primaryDocument: recent.primaryDocument?.[i] || null,
      isAmendment: form.includes('/A'),
    });
  }

  return filings;
}

export function detectNewFilings(
  filings: EdgarFiling[],
  lastAccession: string | null
): EdgarFiling[] {
  if (!lastAccession) {
    return filings.slice(0, 5);
  }

  const newFilings: EdgarFiling[] = [];
  for (const f of filings) {
    if (f.accessionNumber === lastAccession) break;
    newFilings.push(f);
  }
  return newFilings;
}

export function buildEdgarUrl(cik: string, accession: string, primaryDoc: string | null): string {
  return buildFilingUrl(cik, accession, primaryDoc);
}
