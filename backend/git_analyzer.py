import os
import json
from datetime import datetime
from typing import Optional, List
from pathlib import Path
import subprocess
from git import Repo, GitCommandError
from pydantic import BaseModel

class CommitInfo(BaseModel):
    sha: str
    message: str
    author: str
    date: str
    files_changed: int
    insertions: int
    deletions: int
    diff_stat: dict

class GitAnalyzer:
    def __init__(self, repo_path: str):
        """Initialize git analyzer for a repository."""
        self.repo_path = Path(repo_path)
        try:
            self.repo = Repo(self.repo_path)
        except Exception as e:
            raise ValueError(f"Invalid git repository: {e}")
    
    def get_timeline(self, limit: int = 100) -> List[CommitInfo]:
        """Get commit timeline with metadata."""
        commits = []
        try:
            for i, commit in enumerate(self.repo.iter_commits()):
                if i >= limit:
                    break
                
                # Get diff stats
                diff_index = commit.parents[0].diff(commit) if commit.parents else None
                files_changed = len(commit.stats.files) if commit.stats else 0
                insertions = sum(f['insertions'] for f in commit.stats.files.values()) if commit.stats else 0
                deletions = sum(f['deletions'] for f in commit.stats.files.values()) if commit.stats else 0
                
                commits.append(CommitInfo(
                    sha=commit.hexsha[:8],
                    message=commit.message.strip(),
                    author=commit.author.name,
                    date=datetime.fromtimestamp(commit.committed_date).isoformat(),
                    files_changed=files_changed,
                    insertions=insertions,
                    deletions=deletions,
                    diff_stat={
                        'files': files_changed,
                        'insertions': insertions,
                        'deletions': deletions
                    }
                ))
        except Exception as e:
            raise ValueError(f"Error analyzing git history: {e}")
        
        return commits
    
    def get_commit_details(self, sha: str) -> dict:
        """Get detailed information about a specific commit."""
        try:
            commit = self.repo.commit(sha)
            
            # Get changed files
            changed_files = []
            if commit.parents:
                diffs = commit.parents[0].diff(commit)
                for diff in diffs:
                    changed_files.append({
                        'path': diff.b_path or diff.a_path,
                        'status': diff.change_type,
                        'additions': diff.diff.count(b'\n+') if diff.diff else 0,
                        'deletions': diff.diff.count(b'\n-') if diff.diff else 0,
                    })
            
            return {
                'sha': commit.hexsha,
                'message': commit.message.strip(),
                'author': commit.author.name,
                'email': commit.author.email,
                'date': datetime.fromtimestamp(commit.committed_date).isoformat(),
                'changed_files': changed_files,
                'stats': commit.stats.total if commit.stats else {},
                'parents': [p.hexsha[:8] for p in commit.parents],
            }
        except Exception as e:
            raise ValueError(f"Commit not found: {e}")
    
    def get_file_history(self, file_path: str, limit: int = 50) -> List[dict]:
        """Get history of changes for a specific file."""
        try:
            commits = list(self.repo.iter_commits(paths=file_path, max_count=limit))
            
            history = []
            for commit in commits:
                history.append({
                    'sha': commit.hexsha[:8],
                    'message': commit.message.strip(),
                    'author': commit.author.name,
                    'date': datetime.fromtimestamp(commit.committed_date).isoformat(),
                })
            
            return history
        except Exception as e:
            raise ValueError(f"Error getting file history: {e}")
    
    def get_diff(self, sha1: str, sha2: str) -> str:
        """Get diff between two commits."""
        try:
            commit1 = self.repo.commit(sha1)
            commit2 = self.repo.commit(sha2)
            
            diff = commit1.diff(commit2)
            return diff.raw
        except Exception as e:
            raise ValueError(f"Error getting diff: {e}")
    
    def detect_patterns(self) -> dict:
        """Detect code patterns and changes over time."""
        patterns = {
            'total_commits': len(list(self.repo.iter_commits())),
            'total_authors': len(set(c.author.name for c in self.repo.iter_commits())),
            'active_files': len(self.repo.tree.traverse()),
            'recent_activity': self._get_recent_activity(),
            'commit_frequency': self._analyze_commit_frequency(),
        }
        return patterns
    
    def _get_recent_activity(self) -> dict:
        """Analyze recent commit activity."""
        commits = list(self.repo.iter_commits(max_count=30))
        if not commits:
            return {}
        
        recent_date = datetime.fromtimestamp(commits[0].committed_date)
        oldest_date = datetime.fromtimestamp(commits[-1].committed_date)
        
        return {
            'recent_date': recent_date.isoformat(),
            'oldest_date': oldest_date.isoformat(),
            'commits_30d': len(commits),
        }
    
    def _analyze_commit_frequency(self) -> dict:
        """Analyze commit frequency patterns."""
        commits = list(self.repo.iter_commits(max_count=100))
        if not commits:
            return {}
        
        dates = [datetime.fromtimestamp(c.committed_date).date() for c in commits]
        unique_dates = len(set(dates))
        
        return {
            'commits_100': len(commits),
            'active_days': unique_dates,
            'avg_commits_per_day': len(commits) / max(unique_dates, 1),
        }
