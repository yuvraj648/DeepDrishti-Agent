import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function formatTimestamp(ts) {
  if (ts == null || ts === '') return '—';
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export function formatStatus(status) {
  if (status == null || status === '') return '—';
  return String(status).replace(/_/g, ' ');
}

/**
 * @param {object[]} rows - filtered detection documents
 * @param {string} [filterSummary] - human-readable filter line for the report header
 */
export function downloadDetectionsReport(rows, filterSummary = '') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Deep-Drishti', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Detection records export', 14, 19);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 24);

  doc.setTextColor(30, 41, 59);
  let y = 34;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Records in this export: ${rows.length}`, 14, y);
  y += 5;
  if (filterSummary) {
    const split = doc.splitTextToSize(`Active filters: ${filterSummary}`, pageW - 28);
    doc.text(split, 14, y);
    y += split.length * 4 + 4;
  } else {
    y += 4;
  }

  const tableData = rows.map((d) => [
    d.id ?? '—',
    d.cameraSource ?? '—',
    d.objectDetected ?? '—',
    typeof d.confidence === 'number' ? `${d.confidence.toFixed(1)}%` : String(d.confidence ?? '—'),
    formatTimestamp(d.timestamp),
    formatStatus(d.status),
  ]);

  let finalY = y;
  if (tableData.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('No detection records match the current filters.', 14, y + 6);
    finalY = y + 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Detection ID', 'Camera source', 'Object detected', 'Confidence', 'Timestamp', 'Status']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: [8, 145, 178],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    finalY = doc.lastAutoTable?.finalY ?? y + 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Deep-Drishti marine surveillance — confidential operational data. Handle per station policy.',
    14,
    finalY + 10
  );

  doc.save(`deep-drishti-detection-records-${new Date().toISOString().slice(0, 10)}.pdf`);
}
