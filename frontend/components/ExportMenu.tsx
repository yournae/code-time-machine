import React, { useState } from 'react';

interface ExportMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  isDark?: boolean;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ targetRef, isDark = false }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'png' | 'svg' | 'pdf') => {
    if (!targetRef.current) return;
    setExporting(true);

    try {
      const { toPng, toSvg } = await import('html-to-image');

      if (format === 'png') {
        const dataUrl = await toPng(targetRef.current, { quality: 0.95 });
        const link = document.createElement('a');
        link.download = `code-time-machine-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'svg') {
        const dataUrl = await toSvg(targetRef.current);
        const link = document.createElement('a');
        link.download = `code-time-machine-${Date.now()}.svg`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const dataUrl = await toPng(targetRef.current, { quality: 0.95 });
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => { img.onload = resolve; });
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`code-time-machine-${Date.now()}.pdf`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        onChange={(e) => handleExport(e.target.value as any)}
        disabled={exporting}
        className={`px-3 py-1.5 rounded text-sm border cursor-pointer ${
          isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
        }`}
        value=""
      >
        <option value="" disabled>{exporting ? 'Exporting...' : '📥 Export'}</option>
        <option value="png">Export PNG</option>
        <option value="svg">Export SVG</option>
        <option value="pdf">Export PDF</option>
      </select>
    </div>
  );
};
