import React, { useState } from 'react';
import { Timeline } from '../components/Timeline';
import { CommitDetails } from '../components/CommitDetails';
import { analyzeRepository, getCommitDetails } from '../lib/api';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  files_changed: number;
  insertions: number;
  deletions: number;
}

interface RepoInfo {
  path: string;
  totalCommits: number;
  totalAuthors: number;
}

export default function Home() {
  const [repoPath, setRepoPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!repoPath.trim()) {
      setError('Please enter a repository path');
      return;
    }

    setAnalyzing(true);
    setError('');
    setSelectedCommit(null);
    
    try {
      const data = await analyzeRepository(repoPath);
      setCommits(data.timeline || []);
      setRepoInfo({
        path: data.repo_path,
        totalCommits: data.total_commits,
        totalAuthors: data.total_authors,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to analyze repository';
      setError(errorMsg);
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommitSelect = async (commit: Commit) => {
    setLoading(true);
    setError('');
    
    try {
      const repoPathToUse = repoInfo?.path || repoPath;
      if (!repoPathToUse) {
        setError('Repository path not available');
        return;
      }
      
      const details = await getCommitDetails(repoPathToUse, commit.sha);
      setSelectedCommit(details);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load commit details';
      setError(errorMsg);
      console.error('Commit details error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            🕰️ Code Time Machine
          </h1>
          <p className="text-gray-600 mt-2">
            AI-powered Git history analyzer - Explore the story of your code
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Repository Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repository Path
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/path/to/your/git/repository"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              disabled={analyzing}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Repository Info */}
        {repoInfo && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{repoInfo.totalCommits}</div>
                <div className="text-sm text-gray-600">Total Commits</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{repoInfo.totalAuthors}</div>
                <div className="text-sm text-gray-600">Contributors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{commits.length}</div>
                <div className="text-sm text-gray-600">Loaded Commits</div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {commits.length > 0 && (
          <div className="mb-6">
            <Timeline
              commits={commits}
              onCommitSelect={handleCommitSelect}
              selectedSha={selectedCommit?.sha}
            />
          </div>
        )}

        {/* Commit Details */}
        {(selectedCommit || loading) && (
          <CommitDetails commit={selectedCommit} loading={loading} />
        )}

        {/* Empty State */}
        {!commits.length && !analyzing && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🕰️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to explore your code history?
            </h2>
            <p className="text-gray-600 mb-6">
              Enter a git repository path above to start analyzing
            </p>
            <div className="text-left max-w-md mx-auto bg-gray-50 p-4 rounded">
              <p className="text-sm font-semibold mb-2">Example paths:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• /home/user/projects/my-app</li>
                <li>• /tmp/code-time-machine</li>
                <li>• ~/workspace/backend</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          Code Time Machine v1.0 - AI-powered Git history analyzer
        </div>
      </footer>
    </div>
  );
}
