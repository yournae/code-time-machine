#!/usr/bin/env python3
"""
Test script for Code Time Machine backend
"""

import pytest
from pathlib import Path
from git_analyzer import GitAnalyzer


@pytest.fixture
def analyzer():
    """Create a GitAnalyzer for the project repo."""
    repo_path = Path(__file__).parent.parent
    return GitAnalyzer(str(repo_path))


def test_get_timeline_returns_commits(analyzer):
    """Test that get_timeline returns commits with correct fields."""
    timeline = analyzer.get_timeline(limit=5)
    assert len(timeline) > 0, "Expected at least one commit"
    assert len(timeline) <= 5, "Expected at most 5 commits"
    for commit in timeline:
        assert hasattr(commit, 'sha')
        assert hasattr(commit, 'message')
        assert hasattr(commit, 'author')
        assert hasattr(commit, 'date')
        assert hasattr(commit, 'files_changed')
        assert hasattr(commit, 'insertions')
        assert hasattr(commit, 'deletions')


def test_detect_patterns_returns_expected_keys(analyzer):
    """Test that detect_patterns returns expected pattern data."""
    patterns = analyzer.detect_patterns()
    assert 'total_commits' in patterns
    assert 'total_authors' in patterns
    assert 'active_files' in patterns
    assert 'recent_activity' in patterns
    assert 'commit_frequency' in patterns
    assert patterns['total_commits'] > 0
    assert patterns['total_authors'] > 0


def test_get_commit_details_returns_valid_data(analyzer):
    """Test that get_commit_details returns valid commit data."""
    timeline = analyzer.get_timeline(limit=1)
    assert len(timeline) > 0, "Need at least one commit for this test"
    commit = timeline[0]
    details = analyzer.get_commit_details(commit.sha)
    assert 'sha' in details
    assert 'message' in details
    assert 'author' in details
    assert 'changed_files' in details
    assert 'stats' in details
    assert isinstance(details['changed_files'], list)
