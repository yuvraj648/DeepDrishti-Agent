import React from 'react';
import { formatTimestamp, formatStatus } from '../utils/exportDetectionsPdf';

const COLS = ['ID', 'Camera', 'Object', 'Conf.', 'Time', 'Status'];

export default function DetectionExportPreviewPopover({ rows, filterSummary }) {
  const sample = rows.slice(0, 5);
  const total = rows.length;

  return (
    <div
      className="absolute right-0 top-full z-[100] mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-border-muted bg-slate-950/98 shadow-2xl backdrop-blur-sm"
      role="tooltip"
    >
      <div className="border-b border-border-muted px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">PDF preview</p>
        <p className="text-[9px] text-slate-500">
          {total} record{total !== 1 ? 's' : ''} · {new Date().toLocaleString()}
        </p>
      </div>
      <div className="max-h-64 overflow-auto p-2">
        <div className="rounded border border-slate-700 bg-white p-2 text-slate-900 shadow-inner">
          <p className="text-[8px] font-bold leading-tight text-slate-800">Deep-Drishti</p>
          <p className="text-[7px] font-semibold text-slate-600">Detection records export</p>
          <p className="mt-1 text-[6px] text-slate-500">
            Records: {total}
            {filterSummary ? ` · ${filterSummary.slice(0, 120)}${filterSummary.length > 120 ? '…' : ''}` : ''}
          </p>
          <div className="mt-2 overflow-hidden rounded border border-slate-200">
            <table className="w-full border-collapse text-[6px]">
              <thead>
                <tr className="bg-[#0891b2] text-white">
                  {COLS.map((c) => (
                    <th key={c} className="px-0.5 py-0.5 text-left font-bold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-1 py-2 italic text-slate-500">
                      No rows match filters
                    </td>
                  </tr>
                ) : (
                  sample.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 odd:bg-slate-50">
                      <td className="max-w-[3rem] truncate px-0.5 py-0.5 font-mono">{d.id ?? '—'}</td>
                      <td className="max-w-[2.5rem] truncate px-0.5 py-0.5">{d.cameraSource ?? '—'}</td>
                      <td className="max-w-[3rem] truncate px-0.5 py-0.5">{d.objectDetected ?? '—'}</td>
                      <td className="px-0.5 py-0.5">
                        {typeof d.confidence === 'number' ? `${d.confidence.toFixed(0)}%` : '—'}
                      </td>
                      <td className="max-w-[3rem] truncate px-0.5 py-0.5 text-[5px]">
                        {formatTimestamp(d.timestamp)}
                      </td>
                      <td className="max-w-[2.5rem] truncate px-0.5 py-0.5 text-[5px]">
                        {formatStatus(d.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > sample.length && (
            <p className="mt-1 text-[6px] text-slate-500">+ {total - sample.length} more in file…</p>
          )}
        </div>
      </div>
    </div>
  );
}
