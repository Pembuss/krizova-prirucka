// Tabuľky na úzkej obrazovke (telefón): každý riadok sa zobrazí ako karta, kde každá bunka nesie štítok svojho stĺpca.
// JS doplní atribút data-label z hlavičky tabuľky a triedu „stack“; vzhľad rieši CSS (@media max-width: 700px) v app.css.
// Tlač sa nemení (CSS platí len pre obrazovku). Funkcia je idempotentná, takže ju možno volať po každom prekreslení.

const text = (c) => c.textContent.replace(/\s+/g, ' ').trim();

function labelsOf(row) {
  const out = [];
  for (const c of row.cells) { const n = c.colSpan || 1; for (let i = 0; i < n; i++) out.push(text(c)); }
  return out;
}

// Obsah bunky sa zabalí do jedného prvku (.cv), aby sa nerozložil do viacerých stĺpcov mriežky.
// Dlhé texty a odkazy dostanú štítok nad obsah (trieda stack-long), krátke hodnoty štítok vľavo.
function wrap(td) {
  const span = document.createElement('span');
  span.className = 'cv';
  while (td.firstChild) span.appendChild(td.firstChild);
  td.appendChild(span);
  if (text(span).length > 34 || span.querySelectorAll('a, p, ul, br').length) td.classList.add('stack-long');
}

export function stackTables(root = document) {
  for (const tb of root.querySelectorAll('table')) {
    if (tb.closest('.print-root')) continue;
    let head = null;
    const thead = tb.tHead?.rows?.length ? tb.tHead.rows[tb.tHead.rows.length - 1] : null;
    if (thead) head = thead;
    else {
      // bez <thead>: prvý riadok zložený len z <th> a nasledovaný riadkami s <td> je hlavička
      const rows = [...tb.rows];
      const first = rows[0];
      if (first && first.cells.length > 1 && [...first.cells].every((c) => c.tagName === 'TH') && rows.slice(1).some((r) => r.querySelector('td'))) { head = first; first.classList.add('stack-head'); }
    }
    const labels = head ? labelsOf(head) : [];
    tb.classList.add('stack');
    for (const tr of tb.rows) {
      if (tr === head || tr.closest('thead')) continue;
      if (tr.cells.length === 1 && tr.cells[0].colSpan > 1) { tr.classList.add('stack-group'); continue; }
      let col = 0;
      for (const c of tr.cells) {
        if (c.tagName === 'TD' && !c.hasAttribute('data-label') && labels[col]) c.setAttribute('data-label', labels[col]);
        if (c.hasAttribute('data-label') && !c.firstElementChild?.classList?.contains('cv')) wrap(c);
        col += c.colSpan || 1;
      }
    }
  }
}

// Sleduje zmeny obsahu (prekreslenie obrazovky, načítanie kapitoly) a upraví nové tabuľky
export function watchTables(host) {
  let queued = false;
  const run = () => { queued = false; stackTables(host); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(host, { childList: true, subtree: true });
  stackTables(host);
}
