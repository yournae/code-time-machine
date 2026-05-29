import logging
from datetime import datetime
from typing import List
from pathlib import Path
from git import Repo
from pydantic import BaseModel

logger = logging.getLogger(__name__)

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
                
                # Get diff stats (handle shallow clones gracefully)
                try:
                    files_changed = len(commit.stats.files)
                    insertions = sum(f['insertions'] for f in commit.stats.files.values())
                    deletions = sum(f['deletions'] for f in commit.stats.files.values())
                except Exception:
                    files_changed = 0
                    insertions = 0
                    deletions = 0
                
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
            return diff.raw.decode('utf-8', errors='replace')
        except Exception as e:
            raise ValueError(f"Error getting diff: {e}")
    
    def detect_patterns(self) -> dict:
        """Detect code patterns and changes over time."""
        patterns = {
            'total_commits': len(list(self.repo.iter_commits())),
            'total_authors': len(set(c.author.name for c in self.repo.iter_commits())),
            'active_files': len(list(self.repo.tree().traverse())),
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
    
    def get_file_tree_for_dna(self) -> dict:
        """Build a phylogenetic tree of file evolution."""
        tree = {"nodes": [], "links": []}
        file_birth = {}  # file_path -> first commit
        file_death = {}  # file_path -> last commit (if deleted)
        file_renames = {}  # old_path -> new_path
        all_files = set()
        
        for commit in self.repo.iter_commits():
            if not commit.parents:
                continue
            diffs = commit.parents[0].diff(commit, rename_limit=100)
            for diff in diffs:
                path = diff.b_path or diff.a_path
                if diff.renamed_file:
                    file_renames[diff.a_path] = diff.b_path
                    all_files.add(diff.a_path)
                    all_files.add(diff.b_path)
                elif diff.new_file:
                    file_birth[path] = commit.hexsha[:8]
                    all_files.add(path)
                elif diff.deleted_file:
                    file_death[path] = commit.hexsha[:8]
                else:
                    all_files.add(path)
        
        # Build nodes
        for f in all_files:
            tree["nodes"].append({
                "id": f,
                "birth": file_birth.get(f, "root"),
                "death": file_death.get(f, None),
                "type": "file"
            })
        
        # Build links (renames = parent-child relationships)
        for old, new in file_renames.items():
            tree["links"].append({
                "source": old,
                "target": new,
                "type": "rename"
            })
        
        # Also detect file splits (new file appears when old is modified)
        # Group by extension to find family relationships
        ext_groups = {}
        for f in all_files:
            ext = Path(f).suffix or "no-ext"
            ext_groups.setdefault(ext, []).append(f)
        
        for ext, files in ext_groups.items():
            if len(files) > 1:
                for i in range(1, len(files)):
                    tree["links"].append({
                        "source": files[0],
                        "target": files[i],
                        "type": "same_extension"
                    })
        
        return tree
    
    def supercharged_blame(self, file_path: str, limit: int = 50) -> dict:
        """AI-enhanced blame: tracks who changed what, when, and correlates with context."""
        blame_data = {
            "file_path": file_path,
            "lines": [],
            "history": [],
            "hotspots": [],
            "contributors": {}
        }
        
        try:
            # Get file history
            commits = list(self.repo.iter_commits(paths=file_path, max_count=limit))
            
            # Build line-level blame using git blame
            try:
                blame = self.repo.blame("HEAD", file_path)
                for commit, lines in blame:
                    for line in lines:
                        blame_data["lines"].append({
                            "content": line.strip(),
                            "sha": commit.hexsha[:8],
                            "author": commit.author.name,
                            "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                            "message": commit.message.strip()[:100]
                        })
            except Exception:
                # Fallback: just get the current file content
                try:
                    blob = self.repo.head.commit.tree / file_path
                    content = blob.data_stream.read().decode('utf-8', errors='replace')
                    for i, line in enumerate(content.split('\n'), 1):
                        blame_data["lines"].append({
                            "content": line,
                            "sha": "unknown",
                            "author": "unknown",
                            "date": "",
                            "message": ""
                        })
                except Exception:
                    pass
            
            # Build history timeline
            for commit in commits:
                blame_data["history"].append({
                    "sha": commit.hexsha[:8],
                    "message": commit.message.strip()[:100],
                    "author": commit.author.name,
                    "date": datetime.fromtimestamp(commit.committed_date).isoformat(),
                })
            
            # Detect hotspots (lines that changed most frequently)
            line_changes = {}
            for entry in blame_data["lines"]:
                key = entry["sha"]
                line_changes[key] = line_changes.get(key, 0) + 1
            
            blame_data["hotspots"] = sorted(
                [{"sha": sha, "change_count": count} for sha, count in line_changes.items()],
                key=lambda x: x["change_count"],
                reverse=True
            )[:10]
            
            # Contributor stats
            for entry in blame_data["lines"]:
                author = entry["author"]
                if author not in blame_data["contributors"]:
                    blame_data["contributors"][author] = {"lines": 0, "commits": set()}
                blame_data["contributors"][author]["lines"] += 1
                blame_data["contributors"][author]["commits"].add(entry["sha"])
            
            # Convert sets to counts
            for author in blame_data["contributors"]:
                blame_data["contributors"][author]["commits"] = len(
                    blame_data["contributors"][author]["commits"]
                )
            
            return blame_data
        except Exception as e:
            logger.error(f"Error in supercharged_blame: {e}", exc_info=True)
            return {"error": str(e), "file_path": file_path, "lines": [], "history": [], "hotspots": [], "contributors": {}}
    
    def detect_dead_code(self) -> dict:
        """Detect dead/abandoned code in the repository."""
        result = {
            "dead_files": [],
            "stale_files": [],
            "orphaned_files": [],
            "zombie_files": [],
            "stats": {}
        }
        
        try:
            all_commits = list(self.repo.iter_commits(max_count=500))
            if not all_commits:
                return result
            
            now = datetime.now()
            six_months_ago = now.timestamp() - (180 * 24 * 3600)
            
            # Track file activity
            file_last_modified = {}
            file_first_seen = {}
            file_commit_count = {}
            file_authors = {}
            
            for commit in all_commits:
                commit_date = commit.committed_date
                if not commit.parents:
                    continue
                diffs = commit.parents[0].diff(commit)
                for diff in diffs:
                    path = diff.b_path or diff.a_path
                    if not path:
                        continue
                    
                    if path not in file_first_seen:
                        file_first_seen[path] = commit_date
                        file_commit_count[path] = 0
                        file_authors[path] = set()
                    
                    file_last_modified[path] = commit_date
                    file_commit_count[path] += 1
                    file_authors[path].add(commit.author.name)
            
            # Classify files
            for path in file_first_seen:
                last_mod = file_last_modified.get(path, 0)
                first_seen = file_first_seen.get(path, 0)
                commit_count = file_commit_count.get(path, 0)
                authors = file_authors.get(path, set())
                
                entry = {
                    "path": path,
                    "last_modified": datetime.fromtimestamp(last_mod).isoformat() if last_mod else "unknown",
                    "first_seen": datetime.fromtimestamp(first_seen).isoformat() if first_seen else "unknown",
                    "commit_count": commit_count,
                    "authors": list(authors),
                    "age_days": (now.timestamp() - first_seen) / 86400 if first_seen else 0,
                    "stale_days": (now.timestamp() - last_mod) / 86400 if last_mod else 0,
                }
                
                # Dead: never modified after initial commit
                if commit_count <= 1 and first_seen < six_months_ago:
                    entry["reason"] = "Never modified after initial commit"
                    result["dead_files"].append(entry)
                
                # Stale: not touched in 6+ months
                elif last_mod < six_months_ago:
                    entry["reason"] = f"Not modified in {entry['stale_days']:.0f} days"
                    result["stale_files"].append(entry)
                
                # Zombie: only one author, many commits (likely technical debt)
                elif commit_count > 10 and len(authors) == 1:
                    entry["reason"] = f"{commit_count} commits by single author — possible tech debt"
                    result["zombie_files"].append(entry)
            
            # Detect orphaned files (files in tree but never in any commit diff)
            try:
                current_files = set()
                for blob in self.repo.head.commit.tree.traverse():
                    if blob.type == 'blob':
                        current_files.add(blob.path)
                
                modified_files = set(file_last_modified.keys())
                orphaned = current_files - modified_files
                for path in list(orphaned)[:50]:
                    result["orphaned_files"].append({
                        "path": path,
                        "reason": "Exists in tree but no tracked modifications"
                    })
            except Exception:
                pass
            
            # Sort by staleness
            result["stale_files"].sort(key=lambda x: x.get("stale_days", 0), reverse=True)
            result["dead_files"].sort(key=lambda x: x.get("stale_days", 0), reverse=True)
            
            # Stats
            result["stats"] = {
                "total_files_tracked": len(file_first_seen),
                "dead_count": len(result["dead_files"]),
                "stale_count": len(result["stale_files"]),
                "orphaned_count": len(result["orphaned_files"]),
                "zombie_count": len(result["zombie_files"]),
                "health_score": max(0, 100 - (
                    len(result["dead_files"]) * 2 + 
                    len(result["stale_files"]) * 1 + 
                    len(result["zombie_files"]) * 3
                ))
            }
            
            return result
        except Exception as e:
            logger.error(f"Error detecting dead code: {e}", exc_info=True)
            return {"error": str(e), **result}
