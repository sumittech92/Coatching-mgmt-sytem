import { ApiMockPaper } from './mock-paper-api.service';

const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const STYLE = `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:'Times New Roman',Georgia,serif;color:#111;margin:0;font-size:13.5px;line-height:1.5}
.head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}.head h1{font-size:18px;margin:0;letter-spacing:.02em}.head h2{font-size:15px;margin:4px 0 0;font-weight:600}
.meta{display:flex;justify-content:space-between;font-weight:700;margin:6px 0 10px}.inst{border:1px solid #999;padding:8px 12px;margin-bottom:14px;font-size:12.5px}.inst b{display:block;margin-bottom:4px}.inst ol{margin:0;padding-left:18px}
.section{margin:16px 0 6px;text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.section small{display:block;font-weight:400;text-transform:none;letter-spacing:0;font-style:italic}
.q{display:grid;grid-template-columns:30px 1fr 40px;gap:4px;margin:8px 0;page-break-inside:avoid}.q .n{font-weight:700}.q .m{text-align:right;font-weight:700}.q .t{white-space:pre-line}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:2px 18px;margin-top:4px}.key{page-break-before:always}.key h2{text-align:center;font-size:16px;border-bottom:2px solid #111;padding-bottom:6px}
.a{margin:8px 0;page-break-inside:avoid}.a .ans{font-weight:700}.a .exp{color:#333;white-space:pre-line}.foot{text-align:center;font-size:11px;color:#555;margin-top:18px}`;

/** Opens the print dialog for a paper (and optionally its answer key) so it can be printed or saved as PDF. */
export function printMockPaper(paper: ApiMockPaper, institution: string, withAnswers: boolean): void {
  const sections = paper.sections || [];
  const scope = paper.kind === 'full' ? 'Full syllabus' : `Chapter${paper.chapters.length === 1 ? '' : 's'}: ${paper.chapters.join(', ')}`;
  const hours = paper.durationMinutes >= 60 ? `${Math.floor(paper.durationMinutes / 60)} hr${paper.durationMinutes % 60 ? ` ${paper.durationMinutes % 60} min` : ''}` : `${paper.durationMinutes} min`;
  const questions = sections.map(section => `<div class="section">${esc(section.name)}${section.description ? `<small>${esc(section.description)}</small>` : ''}</div>` + section.questions.map(question =>
    `<div class="q"><span class="n">${question.number}.</span><div><div class="t">${esc(question.text)}</div>${question.options.length ? `<div class="opts">${question.options.map((option, index) => `<span>(${LETTERS[index]}) ${esc(option)}</span>`).join('')}</div>` : ''}</div><span class="m">[${question.marks}]</span></div>`).join('')).join('');
  const answers = withAnswers ? `<div class="key"><h2>Answer key &amp; marking points</h2>${sections.flatMap(section => section.questions).map(question => {
    const letter = question.options.length ? question.options.findIndex(option => option.trim() === question.answer.trim()) : -1;
    return `<div class="a"><span class="ans">${question.number}. ${letter >= 0 ? `(${LETTERS[letter]}) ` : ''}${esc(question.answer)}</span>${question.explanation ? `<div class="exp">${esc(question.explanation)}</div>` : ''}</div>`;
  }).join('')}</div>` : '';
  const body = `<div class="head"><h1>${esc(institution)}</h1><h2>${esc(paper.title)}</h2><div>${esc(paper.board)} · ${esc(paper.className)} · ${esc(paper.subject)} · ${esc(scope)}</div></div>
    <div class="meta"><span>Time: ${hours}</span><span>Maximum marks: ${paper.totalMarks}</span></div>
    ${paper.instructions.length ? `<div class="inst"><b>General instructions</b><ol>${paper.instructions.map(line => `<li>${esc(line)}</li>`).join('')}</ol></div>` : ''}
    ${questions}<p class="foot">Practice paper · ${esc(paper.paperCode)}</p>${answers}`;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper.title)}</title><style>@page{size:A4;margin:16mm}${STYLE}</style></head><body>${body}</body></html>`);
  doc.close();
  setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); }, 300);
}
