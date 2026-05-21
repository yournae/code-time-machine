import os
import json
from typing import Optional, List
from pydantic import BaseModel
import httpx

class AIExplainer:
    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None):
        """Initialize AI explainer with LLM API credentials."""
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        self.api_url = api_url or os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")
        self.model = os.getenv("LLM_MODEL", "gpt-4")
    
    async def explain_commit(self, commit_data: dict) -> dict:
        """Generate AI explanation for a commit."""
        prompt = self._build_commit_prompt(commit_data)
        
        try:
            explanation = await self._call_llm(prompt)
            analysis = self._parse_explanation(explanation)
            
            return {
                'summary': analysis.get('summary', ''),
                'impact': analysis.get('impact', 'Unknown'),
                'pattern': analysis.get('pattern', 'Unknown'),
                'reasoning': analysis.get('reasoning', ''),
                'performance_impact': analysis.get('performance_impact', 'Unknown'),
                'security_impact': analysis.get('security_impact', 'Unknown'),
            }
        except Exception as e:
            return {
                'summary': f"Error generating explanation: {e}",
                'impact': 'Unknown',
                'pattern': 'Unknown',
                'reasoning': '',
                'performance_impact': 'Unknown',
                'security_impact': 'Unknown',
            }
    
    async def explain_file_evolution(self, file_history: List[dict]) -> str:
        """Generate narrative for file evolution over time."""
        prompt = self._build_evolution_prompt(file_history)
        
        try:
            narrative = await self._call_llm(prompt)
            return narrative
        except Exception as e:
            return f"Error generating narrative: {e}"
    
    async def detect_code_patterns(self, commits: List[dict]) -> dict:
        """Detect patterns across multiple commits."""
        prompt = self._build_pattern_prompt(commits)
        
        try:
            patterns = await self._call_llm(prompt)
            return self._parse_patterns(patterns)
        except Exception as e:
            return {
                'dead_code': [],
                'performance_regressions': [],
                'architectural_shifts': [],
                'refactoring_opportunities': [],
            }
    
    def _build_commit_prompt(self, commit_data: dict) -> str:
        """Build prompt for commit explanation."""
        files_summary = "\n".join([
            f"- {f['path']} ({f['status']}): +{f['additions']} -{f['deletions']}"
            for f in commit_data.get('changed_files', [])[:10]
        ])
        
        return f"""Analyze this git commit and provide structured insights:

Commit: {commit_data['sha']}
Message: {commit_data['message']}
Author: {commit_data['author']}
Date: {commit_data['date']}

Files Changed:
{files_summary}

Stats: {commit_data.get('stats', {})}

Provide analysis in JSON format:
{{
    "summary": "Brief 1-2 sentence summary of what changed",
    "impact": "Low/Medium/High - overall impact level",
    "pattern": "Type of change (Feature/Bugfix/Refactor/Performance/Security/Architectural)",
    "reasoning": "Detailed explanation of WHY this change was made",
    "performance_impact": "Positive/Negative/Neutral/Unknown - performance implications",
    "security_impact": "Improved/Degraded/Neutral/Unknown - security implications"
}}

Focus on the STORY and REASONING behind the change, not just what changed."""
    
    def _build_evolution_prompt(self, file_history: List[dict]) -> str:
        """Build prompt for file evolution narrative."""
        history_summary = "\n".join([
            f"{h['date'][:10]} | {h['sha']} | {h['message'][:60]}"
            for h in file_history[:20]
        ])
        
        return f"""Tell the story of this file's evolution based on its commit history:

{history_summary}

Write a narrative (2-3 paragraphs) that explains:
1. How this file evolved over time
2. Major milestones or turning points
3. Patterns in how it was modified
4. Current state and trajectory

Write in engaging, storytelling style. Focus on the WHY and HOW, not just WHAT."""
    
    def _build_pattern_prompt(self, commits: List[dict]) -> str:
        """Build prompt for pattern detection."""
        commits_summary = "\n".join([
            f"{c['date'][:10]} | {c['message'][:60]} | {c['files_changed']} files"
            for c in commits[:30]
        ])
        
        return f"""Analyze these commits and detect patterns:

{commits_summary}

Identify and return JSON:
{{
    "dead_code": ["List of potential dead code or unused features"],
    "performance_regressions": ["Commits that may have degraded performance"],
    "architectural_shifts": ["Major architectural changes or refactors"],
    "refactoring_opportunities": ["Areas that need refactoring based on patterns"]
}}

Look for:
- Repeated fixes to same areas (code smell)
- Large commits that touch many files (architectural changes)
- Reverted changes (dead code candidates)
- Performance-related keywords in messages"""
    
    async def _call_llm(self, prompt: str) -> str:
        """Call LLM API."""
        if not self.api_key:
            # Fallback to mock response if no API key
            return self._mock_response(prompt)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a code historian and analyst. Provide insightful, narrative explanations of code changes."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content']
    
    def _mock_response(self, prompt: str) -> str:
        """Generate mock response when no API key available."""
        if "commit" in prompt.lower() and "json" in prompt.lower():
            return json.dumps({
                "summary": "Code changes detected in this commit",
                "impact": "Medium",
                "pattern": "Refactor",
                "reasoning": "This commit appears to refactor existing code for better maintainability",
                "performance_impact": "Neutral",
                "security_impact": "Neutral"
            })
        elif "evolution" in prompt.lower():
            return "This file has evolved through multiple iterations, showing steady development and refinement over time."
        else:
            return json.dumps({
                "dead_code": [],
                "performance_regressions": [],
                "architectural_shifts": [],
                "refactoring_opportunities": []
            })
    
    def _parse_explanation(self, response: str) -> dict:
        """Parse LLM response into structured format."""
        try:
            # Try to extract JSON from response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "{" in response and "}" in response:
                # Find first JSON object
                start = response.index("{")
                end = response.rindex("}") + 1
                return json.loads(response[start:end])
            else:
                return json.loads(response)
        except Exception:
            # Fallback to basic parsing
            return {
                'summary': response[:200],
                'impact': 'Unknown',
                'pattern': 'Unknown',
                'reasoning': response,
                'performance_impact': 'Unknown',
                'security_impact': 'Unknown',
            }
    
    def _parse_patterns(self, response: str) -> dict:
        """Parse pattern detection response."""
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "{" in response and "}" in response:
                start = response.index("{")
                end = response.rindex("}") + 1
                return json.loads(response[start:end])
            else:
                return json.loads(response)
        except Exception:
            return {
                'dead_code': [],
                'performance_regressions': [],
                'architectural_shifts': [],
                'refactoring_opportunities': [],
            }
