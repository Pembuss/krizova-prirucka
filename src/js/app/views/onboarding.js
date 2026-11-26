// Úvodná inštruktáž pri prvom spustení: jazyk → vzhľad → domácnosť → hotovo (s ponukou prehliadky).
// Adresa: #/uvod[/<krok>]
import { store, uid } from '../store.js';
import { t, esc, LANG, switchLang } from '../core.js';
import { icon } from '../icons.js';
import { LANGS as LANG_INFO } from '../../../data/ui.js';
import { chosenTheme, setTheme, applyTheme } from '../theme.js';
import { requestTour } from '../tour.js';
import { rerender } from '../main.js';

const STEPS = 4;
const LOOKS = [['a', 'look.a', 'look.aDesc'], ['b', 'look.b', 'look.bDesc']];

function counts() {
  const m = store.profile.members || [];
  const age = (x) => Number(x.age);
  return {
    adults: m.filter((x) => age(x) >= 18 && age(x) < 65).length,
    kids: m.filter((x) => age(x) < 18).length,
    seniors: m.filter((x) => age(x) >= 65).length,
    pets: (store.profile.pets || []).length,
  };
}
const finish = (tour) => {
  store.prefs.onboarded = true;
  store.savePrefs();
  sessionStorage.setItem('kp.skipIntro', '1');
  if (tour) requestTour(); else location.hash = '#/';
};

export function render(el, [stepArg]) {
  const step = Math.min(Math.max(parseInt(stepArg, 10) || 0, 0), STEPS - 1);
  const go = (n) => { location.hash = `#/uvod/${n}`; };
  const dots = `<div class="onb-dots" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>`;
  const top = `<div class="onb-top">${dots}<button type="button" class="btn btn-ghost btn-sm" data-skip>${esc(t('onb.skip'))}</button></div>
<p class="small muted" style="margin:0">${esc(t('onb.stepOf', { n: step + 1, total: STEPS }))}</p>`;
  let body = '', actions = '';
  const back = step ? `<button type="button" class="btn btn-ghost btn-block" data-go="${step - 1}">${icon('back', 20)} ${esc(t('c.back'))}</button>` : '';
  if (step === 0) {
    body = `<h1>${esc(t('onb.hello'))}</h1><p class="lead">${esc(t('onb.helloLead'))}</p>
<fieldset class="radio-cards"><legend class="section-title">${icon('globe', 20)} ${esc(t('onb.lang'))}</legend>
${LANG_INFO.map((l) => `<label class="radio-card"><input type="radio" name="lang" value="${l.id}" ${l.id === LANG ? 'checked' : ''}><span class="rc-main">${esc(l.name)}${l.unverified ? ` <span class="unverified">${esc(t('c.unverified'))}</span>` : ''}</span><b>${l.short}</b></label>`).join('')}
</fieldset>`;
    actions = `<button type="button" class="btn btn-block" data-go="1">${esc(t('onb.next'))} ${icon('next', 20)}</button>`;
  } else if (step === 1) {
    const cur = chosenTheme();
    body = `<h1>${esc(t('onb.look'))}</h1><p class="lead">${esc(t('onb.lookLead'))}</p>
<fieldset class="look-cards" style="border:0;margin:0;padding:0"><legend class="visually-hidden">${esc(t('onb.look'))}</legend>
${LOOKS.map(([id, n, d]) => `<label class="look-card"><input type="radio" name="look" value="${id}" ${id === cur ? 'checked' : ''}><span class="look-prev look-prev-${id}" aria-hidden="true"><i></i><i></i><i></i></span><span class="rc-main"><strong>${esc(t(n))}</strong><small class="muted" style="display:block">${esc(t(d))}</small></span></label>`).join('')}
</fieldset>
<div><p class="small" style="margin:.2rem 0"><strong>${esc(t('set.size'))}</strong></p><div class="chips">${[['', 'size.normal'], ['xl', 'size.xl']].map(([v, k]) => `<button type="button" class="chip" data-size="${v}" aria-pressed="${((store.prefs.size === 'l' ? 'xl' : store.prefs.size) || '') === v}">${esc(t(k))}</button>`).join('')}</div></div>`;
    actions = `<button type="button" class="btn btn-block" data-go="2">${esc(t('onb.next'))} ${icon('next', 20)}</button>${back}`;
  } else if (step === 2) {
    const has = store.state.wizardDone;
    const c = has ? counts() : { adults: 2, kids: 0, seniors: 0, pets: 0, ...(store.prefs.onbCounts || {}) };
    const row = (k, sub) => `<div class="count-row"><span class="cr-label">${esc(t('onb.' + k))}${sub ? `<small class="muted">${esc(t(sub))}</small>` : ''}</span>
<span class="stepper"><button type="button" data-dec="${k}" aria-label="−">−</button><output data-out="${k}">${c[k]}</output><button type="button" data-inc="${k}" aria-label="+">+</button></span></div>`;
    body = `<h1>${esc(t('onb.home'))}</h1><p class="lead">${esc(t('onb.homeLead'))}</p>
${has ? `<p class="box note">${esc(t('onb.hasProfile'))}</p>` : `${row('adults', 'onb.adultsSub')}${row('kids', 'onb.kidsSub')}${row('seniors', 'onb.seniorsSub')}${row('pets')}
<fieldset class="radio-cards"><legend class="section-title">${icon('home', 20)} ${esc(t('onb.housing'))}</legend>
${[['flat', 'onb.flat'], ['house', 'onb.house']].map(([v, k]) => `<label class="radio-card"><input type="radio" name="housing" value="${v}" ${store.profile.housing.type === v ? 'checked' : ''}><span class="rc-main">${esc(t(k))}</span></label>`).join('')}
</fieldset><p class="small muted">${esc(t('onb.homeNote'))}</p>`}`;
    actions = `<button type="button" class="btn btn-block" data-save-home>${esc(t('onb.next'))} ${icon('next', 20)}</button>${back}`;
  } else {
    body = `<div style="text-align:center">${icon('check', 64)}</div><h1>${esc(t('onb.ready'))}</h1><p class="lead">${esc(t('onb.readyLead'))}</p>
<ol class="onb-steps">${['onb.r1', 'onb.r2', 'onb.r3'].map((k, i) => `<li><span class="n">${i + 1}</span><span>${esc(t(k))}</span></li>`).join('')}</ol>
<p class="small muted">${esc(t('onb.again'))}</p>`;
    actions = `<button type="button" class="btn btn-block" data-finish="tour">${icon('play', 20)} ${esc(t('onb.tour'))}</button><button type="button" class="btn btn-ghost btn-block" data-finish>${esc(t('onb.start'))}</button>`;
  }
  el.innerHTML = `<div class="onb"><div class="onb-inner">${top}${body}<div class="onb-actions">${actions}</div>
<p class="small muted" style="text-align:center;margin:0">${icon('phone', 16)} ${esc(t('onb.emergency'))}</p></div></div>`;

  el.addEventListener('change', (e) => {
    if (e.target.name === 'lang') switchLang(e.target.value).then(rerender);
    if (e.target.name === 'look') setTheme(e.target.value);
  });
  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) go(Number(g.dataset.go));
    if (e.target.closest('[data-skip]')) finish(false);
    const f = e.target.closest('[data-finish]');
    if (f) finish(f.dataset.finish === 'tour');
    const sz = e.target.closest('[data-size]');
    if (sz) {
      store.prefs.size = sz.dataset.size || undefined; store.savePrefs(); applyTheme();
      el.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b === sz)));
    }
    const inc = e.target.closest('[data-inc],[data-dec]');
    if (inc) {
      const k = inc.dataset.inc || inc.dataset.dec;
      const out = el.querySelector(`[data-out="${k}"]`);
      const min = k === 'adults' ? 1 : 0;
      out.textContent = Math.min(12, Math.max(min, Number(out.textContent) + (inc.dataset.inc ? 1 : -1)));
    }
    if (e.target.closest('[data-save-home]')) {
      if (!store.state.wizardDone) {
        const n = (k) => Number(el.querySelector(`[data-out="${k}"]`)?.textContent || 0);
        const c = { adults: n('adults'), kids: n('kids'), seniors: n('seniors'), pets: n('pets') };
        store.prefs.onbCounts = c; store.savePrefs();
        const base = store.profile.members[0] || {};
        const person = (age) => ({ id: uid(), name: '', age, sex: '', diet: {}, meds: [], conditions: '', allergies: '', mobility: 'full', powerDevice: '' });
        const members = [...Array(c.adults)].map(() => person(35)).concat([...Array(c.kids)].map(() => person(8)), [...Array(c.seniors)].map(() => person(72)));
        if (base.name && members[0]) members[0].name = base.name;
        store.profile.members = members;
        store.profile.pets = [...Array(c.pets)].map(() => ({ id: uid(), type: 'dog', name: '', weight: 15 }));
        const h = el.querySelector('input[name="housing"]:checked');
        if (h) store.profile.housing.type = h.value;
        store.saveProfile();
      }
      go(3);
    }
  });
}
