import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * @param {object} payload - `/api/v1/reports/analytics` data object
 */
export function downloadAnalyticsReportPdf(payload) {
  if (!payload) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const { timeframe, summary, charts, recentIncidents, cameraActivity, generatedAt } = payload;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Deep-Drishti', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Operational analytics report', 14, 19);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Window: ${timeframe ?? '—'} · Generated ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}`,
    14,
    25
  );

  doc.setTextColor(30, 41, 59);
  let y = 38;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const s = summary || {};
  const lines = [
    `Total detections: ${s.totalDetections ?? '—'}`,
    `Critical-class alerts: ${s.criticalAlerts ?? '—'}`,
    `Active camera feeds: ${s.activeCameras ?? '—'}`,
    `Average confidence: ${s.avgConfidence != null ? `${s.avgConfidence}%` : '—'}`,
  ];
  doc.text(lines.join('\n'), 14, y);
  y += lines.length * 5 + 6;

  if (charts?.trend?.labels?.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Detection trend (bucketed counts)', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const trendBody = charts.trend.labels.map((label, i) => [
      label,
      String(charts.trend.data[i] ?? 0),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Period', 'Count']],
      body: trendBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [8, 145, 178], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (charts?.threatDistribution?.labels?.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Threat mix (by category)', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const thBody = charts.threatDistribution.labels.map((label, i) => [
      label,
      String(charts.threatDistribution.data[i] ?? 0),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Detections']],
      body: thBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [8, 145, 178], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (recentIncidents?.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Recent incidents (subset)', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const incBody = recentIncidents.map((r) => [
      r.id ?? '—',
      (r.title ?? '—').toString().slice(0, 40),
      r.camera ?? '—',
      r.time ?? '—',
      r.severity ?? '—',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['ID', 'Description', 'Camera', 'Time', 'Severity']],
      body: incBody,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [8, 145, 178], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (cameraActivity?.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Camera relative activity', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const camBody = cameraActivity.map((c) => [c.name, `${c.activity ?? 0}%`, c.status ?? '—']);
    autoTable(doc, {
      startY: y,
      head: [['Camera', 'Relative load', 'Status']],
      body: camBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [8, 145, 178], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Deep-Drishti — analytics export. Metrics reflect database totals for the selected window.',
    14,
    doc.internal.pageSize.getHeight() - 14
  );

  doc.save(`deep-drishti-analytics-${timeframe ?? 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
