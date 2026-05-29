import React from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => (
  <button
    onClick={toggle}
    className={`p-2 rounded-lg transition ${
      isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
    }`}
    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    {isDark ? '☀️' : '🌙'}
  </button>
);
