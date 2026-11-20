import { ApiEntrance } from '../../core/entrance-api.service';
import { BatchApiService } from '../../core/batch-api.service';
import { dayLabel } from '../../core/api-client';

const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const when = (test: ApiEntrance): string => `${dayLabel(test.date)}${test.startTime ? ` · ${BatchApiService.clock(test.startTime)}${test.endTime ? ' – ' + BatchApiService.clock(test.endTime) : ''}` : ''}`;
const RESULT: Record<string, string> = { pending: 'Pending', qualified: 'Qualified', notQualified: 'Not qualified' };

const STYLE = `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Inter,Arial,sans-serif;color:#1f2a3c;margin:0}
.head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #ff2d8a;padding-bottom:10px;margin-bottom:14px}.logo{width:44px;height:44px;border-radius:10px;background:#272f62;color:#fff;display:grid;place-items:center;font:700 20px Georgia,serif;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}
.head h1{font-size:18px;margin:0}.head p{margin:2px 0 0;font-size:12px;color:#4a5568}
.slip{border:1px solid #d6dce4;border-radius:12px;padding:16px;margin-bottom:14px;page-break-inside:avoid}.slip h2{margin:0 0 10px;font-size:13px;letter-spacing:.12em;color:#ff2d8a}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:13px}.grid span{color:#4a5568}.roll{font-size:20px;font-weight:800;letter-spacing:.04em}
.note{font-size:11.5px;color:#4a5568;margin-top:10px;white-space:pre-line}.sign{display:flex;justify-content:space-between;margin-top:26px;font-size:11px;color:#4a5568}.sign span{border-top:1px solid #9aa5b1;padding-top:4px;width:150px;text-align:center}
table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#f4f6f9;text-align:left;padding:7px 8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#4a5568}td{padding:7px 8px;border-bottom:1px solid #e8ecf1}
.num{text-align:right}.q{color:#15803d;font-weight:700}.nq{color:#b91c1c}.stats{display:flex;gap:18px;font-size:12.5px;margin-bottom:10px;color:#4a5568}.stats b{color:#1f2a3c}`;

function header(test: ApiEntrance, institution: string, logo: string | null | undefined, subtitle: string): string {
  return `<div class="head"><div class="logo">${logo ? `<img src="${esc(logo)}" alt="">` : esc(institution.charAt(0) || 'E')}</div><div><h1>${esc(institution)}</h1><p>${esc(subtitle)}</p></div></div>`;
}

/** Prints HTML through a hidden frame (same approach as the fee receipt). */
function print(title: string, body: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:14mm}${STYLE}</style></head><body>${body}</body></html>`);
  doc.close();
  setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); }, 300);
}

/** One admit slip per candidate (roll number, test, date, venue, instructions). */
export function printAdmitSlips(test: ApiEntrance, institution: string, logo?: string | null): void {
  const label = test.workType === 'school' ? 'Class' : 'Course';
  const slips = test.candidates.map(candidate => `<div class="slip">${header(test, institution, logo, `${test.name} · ${label} ${test.className}`)}<h2>ENTRANCE TEST ADMIT SLIP</h2>
    <div class="grid"><span>Roll no.</span><div class="roll">${esc(candidate.rollNo || '—')}</div><span>Candidate</span><b>${esc(candidate.studentName)}</b><span>Parent / guardian</span><div>${esc(candidate.parentName || '—')}</div>
    <span>Mobile</span><div>${esc(candidate.phoneNumber || '—')}</div><span>Date &amp; time</span><div>${esc(when(test))}</div><span>Venue</span><div>${esc(test.venue || '—')}</div><span>Max marks</span><div>${test.maxMarks}</div></div>
    ${test.instructions ? `<p class="note"><b>Instructions:</b> ${esc(test.instructions)}</p>` : ''}<div class="sign"><span>Candidate / parent</span><span>Authorised signatory</span></div></div>`).join('');
  print(`Admit slips · ${test.name}`, slips);
}

/** Ranked result list with marks and Qualified / Not qualified. */
export function printResults(test: ApiEntrance, institution: string, logo?: string | null): void {
  const label = test.workType === 'school' ? 'Class' : 'Course';
  const rows = [...test.candidates].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.studentName.localeCompare(b.studentName)).map(candidate =>
    `<tr><td>${candidate.rank ?? '—'}</td><td>${esc(candidate.rollNo || '—')}</td><td><b>${esc(candidate.studentName)}</b></td><td>${esc(candidate.parentName || '—')}</td><td class="num">${candidate.marks ?? '—'}</td><td class="${candidate.result === 'qualified' ? 'q' : candidate.result === 'notQualified' ? 'nq' : ''}">${RESULT[candidate.result || 'pending']}</td><td>${esc(candidate.remarks || '')}</td></tr>`).join('');
  print(`Results · ${test.name}`, `${header(test, institution, logo, `${test.name} · ${label} ${test.className} · ${when(test)}`)}
    <div class="stats"><span>Candidates <b>${test.candidates.length}</b></span><span>Marked <b>${test.marked}</b></span><span>Qualified <b>${test.qualified}</b></span><span>Pass marks <b>${test.passMarks} / ${test.maxMarks}</b></span>${test.topScore !== null ? `<span>Top score <b>${test.topScore}</b></span><span>Average <b>${test.averageScore}</b></span>` : ''}</div>
    <table><thead><tr><th>Rank</th><th>Roll no.</th><th>Candidate</th><th>Parent</th><th class="num">Marks</th><th>Result</th><th>Remarks</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No candidates yet.</td></tr>'}</tbody></table>`);
}
