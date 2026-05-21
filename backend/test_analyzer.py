#!/usr/bin/env python3
"""
Test script for Code Time Machine backend
"""

import sys
from pathlib import Path
from git_analyzer import GitAnalyzer

def test_git_analyzer():
    """Test GitAnalyzer with this repository."""
    print("🧪 Testing GitAnalyzer...")
    
    try:
        # Analyze current repo
        repo_path = Path(__file__).parent.parent
        analyzer = GitAnalyzer(str(repo_path))
        
        # Test 1: Get timeline
        print("\n✓ Test 1: Get timeline")
        timeline = analyzer.get_timeline(limit=5)
        print(f"  Found {len(timeline)} commits")
        for commit in timeline[:3]:
            print(f"  - {commit.sha}: {commit.message[:50]}")
        
        # Test 2: Get patterns
        print("\n✓ Test 2: Detect patterns")
        patterns = analyzer.detect_patterns()
        print(f"  Total commits: {patterns['total_commits']}")
        print(f"  Total authors: {patterns['total_authors']}")
        print(f"  Active files: {patterns['active_files']}")
        
        # Test 3: Get commit details
        if timeline:
            print("\n✓ Test 3: Get commit details")
            commit = timeline[0]
            details = analyzer.get_commit_details(commit.sha)
            print(f"  SHA: {details['sha']}")
            print(f"  Author: {details['author']}")
            print(f"  Files changed: {len(details['changed_files'])}")
        
        print("\n✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_git_analyzer()
    sys.exit(0 if success else 1)
