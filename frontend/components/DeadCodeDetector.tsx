import React, { useState } from 'react';

interface DeadFile {
  path: string;
  last_modified: string;
  first_seen: string;
  commit_count: number;
  authors: string[];
  stale_days: number;
  reason: string;
}

interface DeadCodeData {
  dead_files: DeadFile[];
  stale_files: DeadFile[];
  orphaned_files: Array<{ path: string; reason: string }>;
  zombie_files: DeadFile[];
  stats: {
    total_files_tracked: number;
    dead_count: number;
    stale_count: number;
    orphaned_count: number;
    zombie_count: number;
    health_score: number;
  };
  ai_recommendations?: {
    recommendations: Array<{ file: string; action: string; risk: string; reason: string }>;
    risk_assessment: string;
    priority_order: string[];
  };
}

interface DeadCodeDetectorProps {
  data: DeadCodeData | null;
  loading: boolean;
  isDark?: boolean;
}

export const DeadCodeDetector: React.FC<DeadCodeDetectorProps> = ({ data, loading, isDark = false }) => {
  const [activeTab, setActiveTab] = useState<'dead' | 'stale' | 'zombie' | 'orphaned' | 'ai'>('dead');

  if (loading) {
    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin text-2xl">🏚️</div>
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Scanning for dead code...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { id: 'dead' as const, label: '💀 Dead', count: data.stats.dead_count },
    { id: 'stale' as const, label: '🏚️ Stale', count: data.stats.stale_count },
    { id: 'zombie' as const, label: '🧟 Zombie', count: data.stats.zombie_count },
    { id: 'orphaned' as const, label: '👻 Orphaned', count: data.stats.orphaned_count },
    { id: 'ai' as const, label: '🤖 AI Cleanup', count: data.ai_recommendations?.recommendations?.length || 0 },
  ];

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Health Score Header */}
      <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🏚️ Dead Code Detector
          </h2>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getHealthColor(data.stats.health_score)}`}>
              {data.stats.health_score}%
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Health Score</div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Dead', value: data.stats.dead_count, color: '#ef4444' },
            { label: 'Stale', value: data.stats.stale_count, color: '#f59e0b' },
            { label: 'Zombie', value: data.stats.zombie_count, color: '#8b5cf6' },
            { label: 'Orphaned', value: data.stats.orphaned_count, color: '#6b7280' },
          ].map(stat => (
            <div key={stat.label} className={`text-center p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* File List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab !== 'ai' && (
          <div className="space-y-2">
            {(activeTab === 'dead' ? data.dead_files
              : activeTab === 'stale' ? data.stale_files
              : activeTab === 'zombie' ? data.zombie_files
              : data.orphaned_files
            ).map((file, i) => (
              <div key={i} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <code className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {file.path}
                  </code>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    activeTab === 'dead' ? 'bg-red-100 text-red-700' :
                    activeTab === 'stale' ? 'bg-yellow-100 text-yellow-700' :
                    activeTab === 'zombie' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {file.reason || 'orphaned'}
                  </span>
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {'stale_days' in file && <span>Stale for {Math.round((file as DeadFile).stale_days)} days · </span>}
                  {'commit_count' in file && <span>{(file as DeadFile).commit_count} commits · </span>}
                  {'authors' in file && <span>{(file as DeadFile).authors?.join(', ')}</span>}
                </div>
              </div>
            ))}
            {(activeTab === 'dead' ? data.dead_files
              : activeTab === 'stale' ? data.stale_files
              : activeTab === 'zombie' ? data.zombie_files
              : data.orphaned_files
            ).length === 0 && (
              <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No {activeTab} files found! 🎉
              </p>
            )}
          </div>
        )}

        {activeTab === 'ai' && data.ai_recommendations && (
          <div className="space-y-4">
            {data.ai_recommendations.risk_assessment && (
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>⚠️ Risk Assessment</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{data.ai_recommendations.risk_assessment}</p>
              </div>
            )}
            {data.ai_recommendations.recommendations?.map((rec, i) => (
              <div key={i} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <code className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{rec.file}</code>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rec.action === 'remove' ? 'bg-red-100 text-red-700' :
                      rec.action === 'archive' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{rec.action}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rec.risk === 'low' ? 'bg-green-100 text-green-700' :
                      rec.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{rec.risk} risk</span>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{rec.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
