import React, { useState } from 'react';

interface BlameLine {
  content: string;
  sha: string;
  author: string;
  date: string;
  message: string;
}

interface BlameAIPanelProps {
  blameData: {
    file_path: string;
    lines: BlameLine[];
    history: any[];
    hotspots: any[];
    contributors: Record<string, { lines: number; commits: number }>;
    ai_context?: {
      sections: Array<{ area: string; purpose: string; concern: string }>;
      summary: string;
      refactoring_suggestions: string[];
    };
  } | null;
  loading: boolean;
  isDark?: boolean;
}

export const BlameAIPanel: React.FC<BlameAIPanelProps> = ({ blameData, loading, isDark = false }) => {
  const [activeTab, setActiveTab] = useState<'blame' | 'contributors' | 'hotspots' | 'ai'>('blame');

  if (loading) {
    return (
      <div className={`rounded-lg shadow p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin text-2xl">🔍</div>
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            Analyzing file blame with AI context...
          </span>
        </div>
      </div>
    );
  }

  if (!blameData) return null;

  const tabs = [
    { id: 'blame' as const, label: '📝 Blame', count: blameData.lines.length },
    { id: 'contributors' as const, label: '👥 Contributors', count: Object.keys(blameData.contributors).length },
    { id: 'hotspots' as const, label: '🔥 Hotspots', count: blameData.hotspots.length },
    { id: 'ai' as const, label: '🤖 AI Analysis', count: blameData.ai_context?.sections?.length || 0 },
  ];

  const authorColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className={`rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          🔍 Git Blame AI — {blameData.file_path}
        </h2>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'blame' && (
          <div className="font-mono text-xs">
            {blameData.lines.slice(0, 200).map((line, i) => {
              const colorIdx = Object.keys(blameData.contributors).indexOf(line.author) % authorColors.length;
              return (
                <div key={i} className={`flex hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} group`}>
                  <span className="w-12 text-right pr-2 shrink-0" style={{ color: authorColors[colorIdx] }}>
                    {line.sha}
                  </span>
                  <span className="w-24 shrink-0 px-1 truncate" style={{ color: authorColors[colorIdx] }}>
                    {line.author}
                  </span>
                  <span className={`flex-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                    {line.content}
                  </span>
                  <span className={`hidden group-hover:inline ml-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {line.message?.substring(0, 40)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'contributors' && (
          <div className="space-y-3">
            {Object.entries(blameData.contributors)
              .sort(([, a], [, b]) => b.lines - a.lines)
              .map(([author, stats], i) => (
                <div key={author} className={`flex items-center gap-3 p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: authorColors[i % authorColors.length] }}>
                    {author[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{author}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {stats.lines} lines · {stats.commits} commits
                    </div>
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (stats.lines / Math.max(...Object.values(blameData.contributors).map(s => s.lines))) * 100)}%`,
                        backgroundColor: authorColors[i % authorColors.length]
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === 'hotspots' && (
          <div className="space-y-2">
            {blameData.hotspots.map((spot, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className="text-2xl">🔥</span>
                <div className="flex-1">
                  <code className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{spot.sha}</code>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {spot.change_count} changes
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai' && blameData.ai_context && (
          <div className="space-y-4">
            {blameData.ai_context.summary && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>📋 Summary</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{blameData.ai_context.summary}</p>
              </div>
            )}
            {blameData.ai_context.sections?.map((section, i) => (
              <div key={i} className={`p-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{section.area}</h4>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{section.purpose}</p>
                {section.concern && (
                  <p className="text-sm mt-1 text-yellow-500">⚠️ {section.concern}</p>
                )}
              </div>
            ))}
            {blameData.ai_context.refactoring_suggestions?.length > 0 && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-green-300' : 'text-green-800'}`}>💡 Refactoring Suggestions</h3>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {blameData.ai_context.refactoring_suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
