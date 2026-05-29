import os
import json
from typing import Optional, List
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
        except Exception:
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
    
    async def explain_blame_context(self, blame_data: dict) -> dict:
        """Generate AI explanations for blame context — WHY each section exists."""
        prompt = self._build_blame_prompt(blame_data)
        try:
            explanation = await self._call_llm(prompt)
            return self._parse_blame_explanation(explanation)
        except Exception as e:
            return {"sections": [], "summary": f"Error: {e}"}
    
    async def explain_dead_code(self, dead_code_data: dict) -> dict:
        """Generate AI recommendations for dead code cleanup."""
        prompt = self._build_dead_code_prompt(dead_code_data)
        try:
            explanation = await self._call_llm(prompt)
            return self._parse_dead_code_explanation(explanation)
        except Exception:
            return {"recommendations": [], "risk_assessment": "Unknown"}
    
    async def generate_dna_narrative(self, tree_data: dict) -> str:
        """Generate a narrative story of the codebase's DNA evolution."""
        prompt = self._build_dna_prompt(tree_data)
        try:
            return await self._call_llm(prompt)
        except Exception as e:
            return f"Error generating DNA narrative: {e}"
    
    def _build_blame_prompt(self, blame_data: dict) -> str:
        contributors = blame_data.get("contributors", {})
        hotspots = blame_data.get("hotspots", [])
        history = blame_data.get("history", [])[:10]
        
        return f"""Analyze this file's blame data and explain WHY each major section exists:

File: {blame_data.get('file_path', 'unknown')}
Contributors: {json.dumps(contributors, indent=2)}
Hotspots (most changed commits): {json.dumps(hotspots[:5], indent=2)}
Recent history: {json.dumps(history, indent=2)}

For each major section of the file, explain:
1. Why it was written
2. What problem it solves
3. Any patterns or concerns

Return JSON:
{{
    "sections": [
        {{"area": "description of code area", "purpose": "why it exists", "concern": "any issues"}}
    ],
    "summary": "overall file health and purpose summary",
    "refactoring_suggestions": ["list of suggestions"]
}}"""
    
    def _build_dead_code_prompt(self, dead_code_data: dict) -> str:
        stats = dead_code_data.get("stats", {})
        dead = dead_code_data.get("dead_files", [])[:10]
        stale = dead_code_data.get("stale_files", [])[:10]
        
        return f"""Analyze this dead code report and provide cleanup recommendations:

Stats: {json.dumps(stats, indent=2)}
Dead files: {json.dumps(dead, indent=2)}
Stale files: {json.dumps(stale, indent=2)}

For each file, assess:
1. Risk of removal (could it still be needed?)
2. Impact on the codebase
3. Recommended action

Return JSON:
{{
    "recommendations": [
        {{"file": "path", "action": "remove/archive/investigate", "risk": "low/medium/high", "reason": "why"}}
    ],
    "risk_assessment": "overall risk of cleanup",
    "priority_order": ["files to clean first"]
}}"""
    
    def _build_dna_prompt(self, tree_data: dict) -> str:
        nodes = tree_data.get("nodes", [])[:30]
        links = tree_data.get("links", [])[:20]
        
        return f"""Tell the evolutionary story of this codebase based on its file DNA:

Files (species): {json.dumps(nodes[:20], indent=2)}
Relationships (mutations): {json.dumps(links[:15], indent=2)}

Write a compelling narrative (3-4 paragraphs) about:
1. The origin story — which files were the ancestors
2. Major evolutionary events — splits, renames, extinctions
3. The current ecosystem — what survived and thrived
4. Evolutionary pressure — what drove the changes

Write like a nature documentary narrator. Make it engaging and insightful."""
    
    def _parse_blame_explanation(self, response: str) -> dict:
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "{" in response:
                start = response.index("{")
                end = response.rindex("}") + 1
                return json.loads(response[start:end])
            return {"sections": [], "summary": response[:200]}
        except Exception:
            return {"sections": [], "summary": response[:200]}
    
    def _parse_dead_code_explanation(self, response: str) -> dict:
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            elif "{" in response:
                start = response.index("{")
                end = response.rindex("}") + 1
                return json.loads(response[start:end])
            return {"recommendations": [], "risk_assessment": response[:200]}
        except Exception:
            return {"recommendations": [], "risk_assessment": response[:200]}
