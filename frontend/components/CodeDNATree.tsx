import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface DNANode {
  id: string;
  birth: string;
  death: string | null;
  type: string;
}

interface DNALink {
  source: string;
  target: string;
  type: string;
}

interface CodeDNATreeProps {
  data: { nodes: DNANode[]; links: DNALink[]; narrative?: string };
  isDark?: boolean;
}

export const CodeDNATree: React.FC<CodeDNATreeProps> = ({ data, isDark = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<DNANode | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'radial'>('radial');

  useEffect(() => {
    if (!data?.nodes?.length || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 600;
    const margin = 40;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const lineColor = isDark ? '#4b5563' : '#d1d5db';

    svg.append('rect').attr('width', width).attr('height', height).attr('fill', bgColor);

    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);

    // Build hierarchy from links
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    data.links.forEach(l => {
      if (!childrenMap.has(l.source)) childrenMap.set(l.source, []);
      childrenMap.get(l.source)!.push(l.target);
      parentMap.set(l.target, l.source);
    });

    // Find root nodes (no parent)
    const roots = data.nodes.filter(n => !parentMap.has(n.id));
    
    // Create hierarchy data
    const buildHierarchy = (nodeId: string): any => {
      const children = childrenMap.get(nodeId) || [];
      return {
        name: nodeId.split('/').pop() || nodeId,
        fullPath: nodeId,
        birth: nodeMap.get(nodeId)?.birth,
        death: nodeMap.get(nodeId)?.death,
        children: children.map(c => buildHierarchy(c))
      };
    };

    const hierarchyData = roots.length > 0 
      ? { name: 'root', children: roots.map(r => buildHierarchy(r.id)) }
      : buildHierarchy(data.nodes[0]?.id || 'unknown');

    const root = d3.hierarchy(hierarchyData);

    // Color scale by file extension
    const extColor = (path: string) => {
      const ext = path?.split('.').pop() || '';
      const colors: Record<string, string> = {
        'py': '#3776ab', 'js': '#f7df1e', 'ts': '#3178c6',
        'tsx': '#3178c6', 'jsx': '#61dafb', 'css': '#264de4',
        'html': '#e34c26', 'json': '#292929', 'md': '#083fa1',
        'yml': '#cb171e', 'yaml': '#cb171e', 'sh': '#4eaa25',
        'go': '#00add8', 'rs': '#dea584', 'rb': '#cc342d',
      };
      return colors[ext] || '#6b7280';
    };

    if (viewMode === 'radial') {
      const radius = Math.min(width, height) / 2 - margin;
      const tree = d3.tree<any>().size([2 * Math.PI, radius]);
      tree(root as any);

      const links = g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkRadial<any, any>()
          .angle((d: any) => d.x)
          .radius((d: any) => d.y)
        );

      const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        .style('cursor', 'pointer')
        .on('click', (_, d: any) => {
          setSelectedNode(nodeMap.get(d.data.fullPath) || null);
        });

      nodes.append('circle')
        .attr('r', (d: any) => d.children ? 3 : 5)
        .attr('fill', (d: any) => d.data.death ? '#ef4444' : extColor(d.data.fullPath));

      nodes.append('text')
        .attr('dy', '0.31em')
        .attr('x', (d: any) => d.x < Math.PI === !d.children ? 6 : -6)
        .attr('text-anchor', (d: any) => d.x < Math.PI === !d.children ? 'start' : 'end')
        .attr('transform', (d: any) => d.x >= Math.PI ? 'rotate(180)' : null)
        .text((d: any) => d.data.name)
        .attr('fill', textColor)
        .attr('font-size', '10px');

    } else {
      const treeLayout = d3.tree<any>().size([width - margin * 2, height - margin * 2]);
      treeLayout(root as any);

      const treeG = g.attr('transform', `translate(${margin},${margin})`);

      treeG.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkHorizontal<any, any>()
          .x((d: any) => d.y)
          .y((d: any) => d.x)
        );

      const nodes = treeG.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .style('cursor', 'pointer')
        .on('click', (_, d: any) => setSelectedNode(nodeMap.get(d.data.fullPath) || null));

      nodes.append('circle')
        .attr('r', (d: any) => d.children ? 3 : 5)
        .attr('fill', (d: any) => d.data.death ? '#ef4444' : extColor(d.data.fullPath));

      nodes.append('text')
        .attr('dx', (d: any) => d.children ? -8 : 8)
        .attr('dy', 3)
        .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
        .text((d: any) => d.data.name)
        .attr('fill', textColor)
        .attr('font-size', '10px');
    }

  }, [data, isDark, viewMode]);

  return (
    <div className={`rounded-lg shadow p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          🧬 Code DNA — Phylogenetic Tree
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('radial')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'radial' ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
          >
            Radial
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'tree' ? 'bg-blue-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
          >
            Tree
          </button>
        </div>
      </div>

      <svg ref={svgRef} className="w-full" style={{ minHeight: '600px' }} />

      {/* Legend */}
      <div className={`mt-4 flex flex-wrap gap-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <span>● <span className="text-green-500">■</span> Alive</span>
        <span>● <span className="text-red-500">■</span> Deleted</span>
        <span className="ml-4">Colors = file extensions</span>
      </div>

      {/* Narrative */}
      {data?.narrative && (
        <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700'}`}>
          <h3 className="font-semibold mb-2">📖 Evolution Narrative</h3>
          <p className="text-sm whitespace-pre-wrap">{data.narrative}</p>
        </div>
      )}

      {/* Selected node detail */}
      {selectedNode && (
        <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📄 {selectedNode.id}
          </h3>
          <div className={`text-sm mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>First seen: {selectedNode.birth}</p>
            {selectedNode.death && <p className="text-red-500">Deleted: {selectedNode.death}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
