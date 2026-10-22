// Rodinný krízový plán: miesta stretnutia, kontakty, spojenie, deti, domov.
import { store } from '../store.js';
import { t, esc, input, textarea, bindForm } from '../core.js';
import { printDocs } from '../printdocs.js';

export function render(el) {
  const p = store.profile;
  const f = p.family;
  const draw = () => {
    el.innerHTML = `<div class="wrap narrow">
<h1>${esc(t('fam.title'))}</h1>
<div class="btn-row"><button class="btn" data-pr="family">🖨️ ${esc(t('fam.printPlan'))}</button><button class="btn btn-ghost" data-pr="wallet">💳 ${esc(t('fam.printCards'))}</button><button class="btn btn-ghost" data-pr="help">🆘 ${esc(t('fam.printHelp'))}</button></div>
<form class="form-grid" onsubmit="return false">
<fieldset><legend>${esc(t('fam.meet'))}</legend>
${input('family.meet1', t('fam.meet1'))}${input('family.meet2', t('fam.meet2'))}${input('family.meet2time', t('fam.meet2time'))}${input('family.meet3', t('fam.meet3'))}</fieldset>
<fieldset><legend>${esc(t('fam.out'))}</legend><div class="two">${input('family.outName', t('fam.name'))}${input('family.outPhone', t('fam.phone'), { type: 'tel' })}</div></fieldset>
<fieldset><legend>${esc(t('fam.contacts'))}</legend>
${(f.contacts || []).map((c, i) => `<div class="three">${input(`family.contacts.${i}.role`, t('fam.role'))}${input(`family.contacts.${i}.name`, t('fam.name'))}${input(`family.contacts.${i}.phone`, t('fam.phone'), { type: 'tel' })}<button class="btn btn-ghost btn-sm" type="button" data-del="${i}" aria-label="${esc(t('c.delete'))}">✕</button></div>`).join('')}
<button class="btn btn-ghost" type="button" data-add>＋ ${esc(t('fam.addContact'))}</button></fieldset>
<fieldset><legend>${esc(t('fam.comms'))}</legend>${input('family.radio', t('fam.radio'))}${input('family.pmr', t('fam.pmr'))}${input('family.checkin', t('fam.checkin'))}</fieldset>
<fieldset><legend>${esc(t('fam.kids'))}</legend>${input('family.school', t('fam.school'))}${input('family.pickup', t('fam.pickup'))}</fieldset>
<fieldset><legend>${esc(t('fam.home'))}</legend>${input('family.valves', t('fam.valves'))}${input('family.homeShelter', t('fam.homeShelter'))}${input('family.assembly', t('fam.assembly'))}${textarea('family.notes', t('fam.notes'))}</fieldset>
</form></div>`;
  };
  draw();
  bindForm(el);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) { (f.contacts ||= []).push({ role: '', name: '', phone: '' }); store.saveProfile(); draw(); }
    const d = e.target.closest('[data-del]');
    if (d) { f.contacts.splice(Number(d.dataset.del), 1); store.saveProfile(); draw(); }
    const pr = e.target.closest('[data-pr]');
    if (pr) printDocs([pr.dataset.pr]);
  });
}
