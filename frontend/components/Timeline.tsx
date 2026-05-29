import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  files_changed: number;
  insertions: number;
  deletions: number;
}

interface CommitWithDate extends Commit {
  date: Date;
  totalChanges: number;
}

interface TimelineProps {
  commits: Commit[];
  onCommitSelect: (commit: Commit) => void;
  selectedSha?: string;
  isDark?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ commits, onCommitSelect, selectedSha, isDark = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!commits.length || !svgRef.current) return;

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#e5e7eb' : '#000000';
    const gridOpacity = isDark ? 0.15 : 0.1;
    const axisColor = isDark ? '#9ca3af' : '#000000';

    // Parse dates
    const data = commits.map(c => ({
      ...c,
      date: new Date(c.date),
      totalChanges: c.insertions + c.deletions
    })).reverse();

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.totalChanges) as number])
      .range([height, 0]);

    // Line generator
    const line = d3.line<typeof data[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.totalChanges));

    // Add grid
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', gridOpacity)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      );

    // Add path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add circles for commits
    svg.selectAll('.commit-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'commit-dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.totalChanges))
      .attr('r', d => d.sha === selectedSha ? 6 : 4)
      .attr('fill', d => d.sha === selectedSha ? '#ef4444' : '#3b82f6')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('click', (_, d) => onCommitSelect(d as unknown as Commit))
      .on('mouseover', function() {
        d3.select(this).attr('r', 6).attr('opacity', 1);
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .attr('r', d.sha === selectedSha ? 6 : 4)
          .attr('opacity', 0.7);
      });

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .attr('color', axisColor)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('fill', textColor)
      .attr('text-anchor', 'middle')
      .text('Date');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .attr('color', axisColor)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .attr('fill', textColor)
      .attr('text-anchor', 'middle')
      .text('Total Changes');

  }, [commits, selectedSha, onCommitSelect, isDark]);

  return (
    <div className={`w-full rounded-lg shadow p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Commit Timeline</h2>
      <svg ref={svgRef} className="w-full" style={{ minHeight: '400px' }} />
    </div>
  );
};
