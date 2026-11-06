const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDocumentInfo() {
  const res = await fetch(`${API_BASE}/document-info`);
  if (!res.ok) throw new Error('Failed to fetch document info');
  return res.json();
}

export async function fetchDocumentProperties() {
  const res = await fetch(`${API_BASE}/document/properties`);
  if (!res.ok) throw new Error('Failed to fetch document properties');
  return res.json();
}

export async function fetchPageData(pageNum, zoom = 1.5) {
  const res = await fetch(`${API_BASE}/page/${pageNum}?zoom=${zoom}`);
  if (!res.ok) throw new Error(`Failed to load page ${pageNum + 1}`);
  return res.json();
}

export async function uploadPdfFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload PDF');
  }
  return res.json();
}

export async function loadSamplePdf() {
  const res = await fetch(`${API_BASE}/load-sample`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to load sample PDF');
  return res.json();
}

export async function searchDocument(query, caseSensitive = false) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, caseSensitive }),
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function rotatePageApi(pageNumber, angle = 90) {
  const res = await fetch(`${API_BASE}/page/rotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, angle }),
  });
  if (!res.ok) throw new Error('Failed to rotate page');
  return res.json();
}

export async function deletePageApi(pageNumber) {
  const res = await fetch(`${API_BASE}/page/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete page');
  }
  return res.json();
}

export async function duplicatePageApi(pageNumber) {
  const res = await fetch(`${API_BASE}/page/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber }),
  });
  if (!res.ok) throw new Error('Failed to duplicate page');
  return res.json();
}

export async function requestPagePreview(pageNumber, modifications, rotationDelta = 0, zoom = 1.5) {
  const res = await fetch(`${API_BASE}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, modifications, rotationDelta, zoom }),
  });
  if (!res.ok) throw new Error('Failed to render page preview');
  return res.json();
}

export async function exportModifiedPdf(modifications, pageOrder = null, pageRotations = null) {
  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modifications, pageOrder, pageRotations }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Export failed');
  }
  return res.json();
}

export function getDownloadUrl() {
  return `${API_BASE}/download`;
}
