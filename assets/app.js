// ---------- Hilfsfunktionen ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Wertebereiche wie [10-20] gold hervorheben (Text wird vorher escaped)
const fmt = s => esc(String(s).trim()).replace(/\[[^\]]+\]/g, m => `<span class="range">${m}</span>`);
// Alle Suchwörter müssen im Text vorkommen
const has = (text, q) => {
  const t = String(text).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w));
};
const GEMS = ['rune', 'ruby', 'saphire', 'amethyst', 'topaz'];
const RESIST_COLOR = { Fire: 'red', Phys: 'gray', Lightning: 'yellow', Cold: 'blue', Poison: 'green', 'Poison-Length': 'green', Overcap: 'green' };
const TABS = [
  ['runewords', 'Runewords'],
  ['crafting', 'Crafting'],
  ['cube', 'Cube Recipes'],
  ['corruptions', 'Corruptions'],
  ['weapons', 'Unique Weapons'],
  ['bosses', 'Uber Bosses'],
];
const load = n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); });

function app() {
  return {
    tabs: TABS, fmt, RESIST_COLOR,
    tab: 'runewords', loading: true, error: '',
    runewords: [], craft: { types: [], slots: [] }, recipes: [], corruptions: [], weapons: [], bosses: [],

    // Zustand der Filter pro Bereich
    rw: { q: '', sockets: '', rune: '', type: '', sort: 'default' },
    cu: { q: '', cat: '' },
    cr: { q: '', type: '', slot: '' },
    co: { q: '', cat: '' },
    uw: { q: '', type: '', hand: '' },
    boss: 0,

    async init() {
      const route = () => { const h = location.hash.slice(1); this.tab = TABS.some(t => t[0] === h) ? h : 'runewords'; };
      route(); addEventListener('hashchange', route);
      try {
        const [rw, cr, cu, co, uw, bo] = await Promise.all(['runewords', 'crafting', 'cuberecipes', 'corruptions', 'uniqueweapons', 'uberbosses'].map(load));
        this.runewords = rw.Runewords.map(r => ({
          ...r,
          ItemType: r.ItemType.trim(),
          Runes: [1, 2, 3, 4, 5, 6].map(i => r['Rune' + i]).filter(Boolean),
        }));
        this.craft = cr;
        this.recipes = cu.Recipes.map(r => ({
          ...r,
          Ingridients: r.Ingridients.map(i => {
            // Manche Einträge haben fehlende oder vertauschte Felder – hier robust machen
            const known = GEMS.includes(i.Class);
            return { name: i.Name, cls: known ? i.Class : '', info: i.Info || (known ? '' : i.Class || '') };
          }),
        }));
        this.corruptions = co.Corruptions;
        this.weapons = uw.Weapons;
        this.bosses = bo.bosses;
      } catch (e) {
        this.error = 'Daten konnten nicht geladen werden. Bitte die Seite über einen Webserver öffnen (siehe README).';
        console.error(e);
      } finally { this.loading = false; }
    },

    // ---------- Runewords ----------
    get rwTypes() { return [...new Set(this.runewords.map(r => r.ItemType))].sort(); },
    get rwList() {
      const f = this.rw;
      const list = this.runewords.filter(r =>
        (!f.sockets || r.Sockets == f.sockets) &&
        (!f.type || r.ItemType === f.type) &&
        has(r.Runes.join(' '), f.rune) &&
        has([r.Name, r.ItemType, ...r.Runes, ...r.Bonuses].join(' '), f.q));
      const by = { name: (a, b) => a.Name.localeCompare(b.Name), level: (a, b) => a.CharacterLevel - b.CharacterLevel, sockets: (a, b) => a.Sockets - b.Sockets };
      return by[f.sort] ? list.sort(by[f.sort]) : list;
    },
    resetRw() { this.rw = { q: '', sockets: '', rune: '', type: '', sort: 'default' }; },

    // ---------- Cube ----------
    get cuCats() { return [...new Set(this.recipes.map(r => r.Category))]; },
    get cuList() {
      const f = this.cu;
      return this.recipes.filter(r =>
        (!f.cat || r.Category === f.cat) &&
        has([r.Result, r.Notes, ...r.Ingridients.map(i => i.name + ' ' + i.info)].join(' '), f.q));
    },

    // ---------- Crafting ----------
    get crList() {
      const f = this.cr, out = [];
      for (const s of this.craft.slots) {
        if (f.slot && s.slot !== f.slot) continue;
        for (const t of this.craft.types) {
          if (f.type && t !== f.type) continue;
          const r = s.recipes[t];
          if (r && has([t, s.slot, r.rune, r.gem, ...r.mods].join(' '), f.q)) out.push({ ...r, type: t, slot: s.slot });
        }
      }
      return out;
    },

    // ---------- Corruptions ----------
    get coList() {
      const f = this.co;
      return this.corruptions.filter(c => !f.cat || c.Category === f.cat).map(c => {
        const pick = list => (list || []).filter(m => has(m, f.q));
        const cols = [['Low rarity', '~50%', pick(c.LowRarity)], ['Mid rarity', '~30%', pick(c.MidRarity)], ['High rarity', '~20%', pick(c.HighRarity)]];
        return { name: c.Category, cols, hits: cols.reduce((n, x) => n + x[2].length, 0) };
      }).filter(c => c.hits);
    },

    // ---------- Unique Weapons ----------
    get uwTypes() { return [...new Set(this.weapons.map(w => w.Type))].sort(); },
    get uwHands() { return [...new Set(this.weapons.map(w => w.Hander))].sort(); },
    get uwList() {
      const f = this.uw;
      return this.weapons.filter(w =>
        (!f.type || w.Type === f.type) && (!f.hand || w.Hander === f.hand) &&
        has([w.Name, w.Type, w.BaseTypeName, ...w.Bonuses].join(' '), f.q));
    },
    uwStats(w) {
      return [['Base', w.BaseTypeName], ['Hands', w.Hander], ['Damage', w.Damage], ['Avg. damage', w['Average Damage']],
        ['Base damage', w['Base-Damage']], ['Speed', w['Base-Speed']], ['Range', w['Base-Melee Range']], ['Max. sockets', w['Base-Maximum Sockets']]]
        .filter(x => x[1]);
    },
  };
}
