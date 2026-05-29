const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

interface AnalyzeRequest {
  repo_path: string;
}

export interface TimelineData {
  repo_path: string;
  total_commits: number;
  total_authors: number;
  timeline: any[];
}

export async function analyzeRepository(repoPath: string): Promise<TimelineData> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_path: repoPath }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Analysis failed');
  }
  return res.json();
}

export async function getCommitDetails(repoPath: string, sha: string): Promise<any> {
  const params = new URLSearchParams({ repo_path: repoPath, sha });
  const res = await fetch(`${API_BASE}/commit?${params}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Failed to fetch commit details');
  }
  return res.json();
}

export async function getCodeDNA(repoPath: string): Promise<any> {
  const params = new URLSearchParams({ repo_path: repoPath });
  const res = await fetch(`${API_BASE}/code-dna?${params}`);
  if (!res.ok) throw new Error('Failed to fetch code DNA');
  return res.json();
}

export async function getBlame(repoPath: string, filePath: string): Promise<any> {
  const params = new URLSearchParams({ repo_path: repoPath, file_path: filePath });
  const res = await fetch(`${API_BASE}/blame?${params}`);
  if (!res.ok) throw new Error('Failed to fetch blame');
  return res.json();
}

export async function getDeadCode(repoPath: string): Promise<any> {
  const params = new URLSearchParams({ repo_path: repoPath });
  const res = await fetch(`${API_BASE}/dead-code?${params}`);
  if (!res.ok) throw new Error('Failed to fetch dead code');
  return res.json();
}

export function createWebSocket(onMessage: (data: any) => void): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/explain`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  return ws;
}
