import React, { useState, useRef } from 'react';
import { Timeline } from '../components/Timeline';
import { CommitDetails } from '../components/CommitDetails';
import { CodeDNATree } from '../components/CodeDNATree';
import { BlameAIPanel } from '../components/BlameAIPanel';
import { DeadCodeDetector } from '../components/DeadCodeDetector';
import { ThemeToggle } from '../components/ThemeToggle';
import { ExportMenu } from '../components/ExportMenu';
import { analyzeRepository, getCommitDetails, getCodeDNA, getBlame, getDeadCode } from '../lib/api';

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

  // Dark mode & feature tabs
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState<'timeline' | 'dna' | 'blame' | 'deadcode'>('timeline');
  const [dnaData, setDnaData] = useState<any>(null);
  const [blameData, setBlameData] = useState<any>(null);
  const [deadCodeData, setDeadCodeData] = useState<any>(null);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [blameFilePath, setBlameFilePath] = useState('');

  const mainRef = useRef<HTMLDivElement>(null);

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

  const handleViewChange = async (view: typeof activeView) => {
    setActiveView(view);
    const repoPathToUse = repoInfo?.path || repoPath;
    if (!repoPathToUse) return;

    if (view === 'dna' && !dnaData) {
      setFeatureLoading(true);
      try {
        const data = await getCodeDNA(repoPathToUse);
        setDnaData(data);
      } catch (err) {
        console.error('Code DNA error:', err);
      } finally {
        setFeatureLoading(false);
      }
    } else if (view === 'blame' && !blameData && blameFilePath) {
      setFeatureLoading(true);
      try {
        const data = await getBlame(repoPathToUse, blameFilePath);
        setBlameData(data);
      } catch (err) {
        console.error('Blame error:', err);
      } finally {
        setFeatureLoading(false);
      }
    } else if (view === 'deadcode' && !deadCodeData) {
      setFeatureLoading(true);
      try {
        const data = await getDeadCode(repoPathToUse);
        setDeadCodeData(data);
      } catch (err) {
        console.error('Dead code error:', err);
      } finally {
        setFeatureLoading(false);
      }
    }
  };

  const handleBlameSearch = async () => {
    if (!blameFilePath.trim()) return;
    const repoPathToUse = repoInfo?.path || repoPath;
    if (!repoPathToUse) return;
    setFeatureLoading(true);
    try {
      const data = await getBlame(repoPathToUse, blameFilePath);
      setBlameData(data);
    } catch (err) {
      console.error('Blame error:', err);
    } finally {
      setFeatureLoading(false);
    }
  };

  const bgClass = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const headerBg = isDark ? 'bg-gray-800' : 'bg-white';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  const viewTabs = [
    { id: 'timeline' as const, label: '📊 Timeline' },
    { id: 'dna' as const, label: '🧬 Code DNA' },
    { id: 'blame' as const, label: '🔍 Blame AI' },
    { id: 'deadcode' as const, label: '🏚️ Dead Code' },
  ];

  return (
    <div className={`min-h-screen ${bgClass} ${isDark ? 'dark' : ''}`}>
      {/* Header */}
      <header className={`${headerBg} shadow`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className={`text-3xl font-bold ${textPrimary} flex items-center gap-3`}>
                🕰️ Code Time Machine
              </h1>
              <p className={`${textSecondary} mt-2`}>
                AI-powered Git history analyzer - Explore the story of your code
              </p>
            </div>
            <div className="flex items-center gap-3">
              {repoInfo && <ExportMenu targetRef={mainRef as any} isDark={isDark} />}
              <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="max-w-7xl mx-auto px-4 py-8">
        {/* Repository Input */}
        <div className={`${cardBg} rounded-lg shadow p-6 mb-6`}>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Repository Path
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/path/to/your/git/repository"
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
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
            <div className={`mt-3 p-3 ${isDark ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} border rounded text-sm`}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Repository Info */}
        {repoInfo && (
          <div className={`${cardBg} rounded-lg shadow p-4 mb-6`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{repoInfo.totalCommits}</div>
                <div className={`text-sm ${textSecondary}`}>Total Commits</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{repoInfo.totalAuthors}</div>
                <div className={`text-sm ${textSecondary}`}>Contributors</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{commits.length}</div>
                <div className={`text-sm ${textSecondary}`}>Loaded Commits</div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Tabs */}
        {repoInfo && (
          <div className={`${cardBg} rounded-lg shadow mb-6`}>
            <div className={`flex border-b ${borderColor} overflow-x-auto`}>
              {viewTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleViewChange(tab.id)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Blame file path input */}
            {activeView === 'blame' && (
              <div className={`p-4 border-b ${borderColor}`}>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={blameFilePath}
                    onChange={(e) => setBlameFilePath(e.target.value)}
                    placeholder="Enter file path (e.g. src/main.py)"
                    className={`flex-1 px-3 py-1.5 border rounded text-sm ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlameSearch()}
                  />
                  <button
                    onClick={handleBlameSearch}
                    disabled={featureLoading || !blameFilePath.trim()}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Analyze Blame
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline View */}
        {activeView === 'timeline' && commits.length > 0 && (
          <div className="mb-6">
            <Timeline
              commits={commits}
              onCommitSelect={handleCommitSelect}
              selectedSha={selectedCommit?.sha}
              isDark={isDark}
            />
          </div>
        )}

        {/* Commit Details */}
        {activeView === 'timeline' && (selectedCommit || loading) && (
          <CommitDetails commit={selectedCommit} loading={loading} />
        )}

        {/* Code DNA View */}
        {activeView === 'dna' && (
          <div className="mb-6">
            {featureLoading ? (
              <div className={`${cardBg} rounded-lg shadow p-6`}>
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-2xl">🧬</div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Building phylogenetic tree...</span>
                </div>
              </div>
            ) : dnaData ? (
              <CodeDNATree data={dnaData} isDark={isDark} />
            ) : (
              <div className={`${cardBg} rounded-lg shadow p-6 text-center`}>
                <p className={textSecondary}>Select Code DNA tab to load data</p>
              </div>
            )}
          </div>
        )}

        {/* Blame AI View */}
        {activeView === 'blame' && (
          <div className="mb-6">
            {blameFilePath && (featureLoading || blameData) ? (
              <BlameAIPanel blameData={blameData} loading={featureLoading} isDark={isDark} />
            ) : (
              <div className={`${cardBg} rounded-lg shadow p-6 text-center`}>
                <p className={textSecondary}>Enter a file path above to analyze blame</p>
              </div>
            )}
          </div>
        )}

        {/* Dead Code View */}
        {activeView === 'deadcode' && (
          <div className="mb-6">
            {featureLoading ? (
              <div className={`${cardBg} rounded-lg shadow p-6`}>
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-2xl">🏚️</div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Scanning for dead code...</span>
                </div>
              </div>
            ) : deadCodeData ? (
              <DeadCodeDetector data={deadCodeData} loading={false} isDark={isDark} />
            ) : (
              <div className={`${cardBg} rounded-lg shadow p-6 text-center`}>
                <p className={textSecondary}>Select Dead Code tab to scan</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!commits.length && !analyzing && (
          <div className={`${cardBg} rounded-lg shadow p-12 text-center`}>
            <div className="text-6xl mb-4">🕰️</div>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
              Ready to explore your code history?
            </h2>
            <p className={`${textSecondary} mb-6`}>
              Enter a git repository path above to start analyzing
            </p>
            <div className={`text-left max-w-md mx-auto ${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded`}>
              <p className={`text-sm font-semibold mb-2 ${textPrimary}`}>Example paths:</p>
              <ul className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-1`}>
                <li>• /home/user/projects/my-app</li>
                <li>• /tmp/code-time-machine</li>
                <li>• ~/workspace/backend</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`${headerBg} border-t ${borderColor} mt-12`}>
        <div className={`max-w-7xl mx-auto px-4 py-6 text-center ${textSecondary} text-sm`}>
          Code Time Machine v2.0 - AI-powered Git history analyzer
        </div>
      </footer>
    </div>
  );
}
