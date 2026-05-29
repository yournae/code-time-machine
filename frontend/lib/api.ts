const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AnalyzeRequest {
  repo_path: string;
}

interface TimelineData {
  commits: any[];
  stats: any;
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
