import React from 'react';

interface CommitDetails {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: string;
  changed_files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  stats: any;
  explanation?: {
    summary: string;
    impact: string;
    pattern: string;
    reasoning: string;
    performance_impact: string;
    security_impact: string;
  };
}

interface CommitDetailsProps {
  commit: CommitDetails | null;
  loading: boolean;
}

export const CommitDetails: React.FC<CommitDetailsProps> = ({ commit, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!commit) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        Select a commit from the timeline to see details
      </div>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'A': return '➕';
      case 'M': return '✏️';
      case 'D': return '❌';
      case 'R': return '🔄';
      default: return '📄';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="border-b pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {commit.message}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>👤 {commit.author}</span>
              <span>📅 {new Date(commit.date).toLocaleString()}</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {commit.sha.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      {commit.explanation && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🤖 AI Analysis
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-gray-700">{commit.explanation.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-semibold text-gray-600">Impact</span>
                <div className={`inline-block px-2 py-1 rounded text-sm font-medium ml-2 ${getImpactColor(commit.explanation.impact)}`}>
                  {commit.explanation.impact}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Pattern</span>
                <div className="inline-block px-2 py-1 rounded text-sm font-medium ml-2 bg-purple-100 text-purple-600">
                  {commit.explanation.pattern}
                </div>
              </div>
            </div>

            {commit.explanation.reasoning && (
              <div className="pt-2 border-t border-blue-200">
                <p className="text-sm text-gray-700 italic">
                  💡 {commit.explanation.reasoning}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="text-sm">
                <span className="font-semibold">⚡ Performance:</span>
                <span className="ml-2">{commit.explanation.performance_impact}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">🔒 Security:</span>
                <span className="ml-2">{commit.explanation.security_impact}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changed Files */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          📁 Changed Files ({commit.changed_files.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {commit.changed_files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getStatusIcon(file.status)}</span>
                <span className="font-mono text-sm truncate">{file.path}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600">+{file.additions}</span>
                <span className="text-red-600">-{file.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {commit.stats && Object.keys(commit.stats).length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {commit.changed_files.length}
              </div>
              <div className="text-xs text-gray-600">Files Changed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                +{commit.changed_files.reduce((sum, f) => sum + f.additions, 0)}
              </div>
              <div className="text-xs text-gray-600">Additions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                -{commit.changed_files.reduce((sum, f) => sum + f.deletions, 0)}
              </div>
              <div className="text-xs text-gray-600">Deletions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
