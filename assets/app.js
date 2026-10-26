// ---------- Hilfsfunktionen ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Wertebereiche wie [10-20] gold hervorheben (Text wird vorher escaped)
const fmt = s => esc(String(s).trim()).replace(/\[[^\]]+\]/g, m => `<span class="range">${m}</span>`);
// Cube-Ergebnis: zusätzlich Zahlen wie 1-6 hervorheben, Punkt am Ende weglassen
const fmtResult = s => esc(String(s).trim().replace(/\.$/, '')).replace(/\[[^\]]+\]|\b\d+(?:-\d+)?\b/g, m => `<span class="range">${m}</span>`);
// Bonus als Datenblatt-Zeile: Wert links in eigener Spalte, Label rechts, Bedingung als Pille.
// "+30% Faster Cast Rate (Staves Only)" → +30% | Faster Cast Rate [Staves Only]
const VAL = String.raw`[+-]?(?:\[[^\]]+\]|\d+(?:\.\d+)?)(?:-\d+(?:\.\d+)?)?%?`;
const MOD_RULES = [
  [new RegExp(`^Adds (${VAL}(?: to ${VAL})?) (.+)$`), m => [m[1], m[2]]], // Adds 3-14 Cold Damage
  [new RegExp(`^Level (${VAL}) (.+)$`), m => ['Lvl ' + m[1], m[2]]],     // Level 15 Desecrate
  [new RegExp(`^(.+) \\(Level (${VAL})\\)$`), m => ['Lvl ' + m[2], m[1]]], // Fires Magic Arrows (Level 6)
  [new RegExp(`^Socketed \\((${VAL})\\)$`), m => [m[1], 'Sockets']],     // Socketed (3)
  [new RegExp(`^You May (?:Now )?Summon \\+?(${VAL}) (Additional .+)$`), m => ['+' + m[1], m[2]]],
  [new RegExp(`^(${VAL})(?: [Tt]o)? (.+)$`), m => [m[1], m[2]]],          // +2 to All Skills
  [new RegExp(`^(.+?) (?:by |of )?(${VAL})$`), m => [m[2], m[1]]],        // Cold Resist +35%
];
const MOD_COND = /\s*\(([^()]*(?:Only|per Character Level|Charges)[^()]*)\)$/i;
const splitMod = raw => {
  let s = String(raw).trim(), cm;
  const conds = [];
  while ((cm = s.match(MOD_COND))) { conds.unshift(cm[1]); s = s.slice(0, cm.index); } // "(Amazon Only) (Bows Only)"
  const c = conds.join(' · ');
  // Mehrere Werte in einer Zeile ("A, B" / "A or B") nicht zerlegen
  if (!/, |\bor\b/.test(s)) {
    for (const [re, pick] of MOD_RULES) {
      const m = s.match(re);
      if (m) { const [v, l] = pick(m); return { v, l, c }; }
    }
  }
  return { v: '', l: s, c };
};
const fmtMod = raw => {
  if (/^(or|and)$/.test(String(raw).trim())) return esc(raw); // Trenner bei Varianten (Kadala's Heirloom)
  const { v, l, c } = splitMod(raw);
  const val = v
    ? `<span class="mv${v.includes('[') ? ' r' : ''}">${esc(v.replace(/[[\]]/g, ''))}</span>`
    : '<span class="mv dot" aria-hidden="true">•</span>';
  return `${val}<span class="ml">${fmt(l)}${c ? ` <span class="cond">${fmt(c)}</span>` : ''}</span>`;
};
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
  ['armor', 'Unique Armor'],
  ['accessories', 'Unique Accessories'],
  ['bosses', 'Uber Bosses'],
];
// Runenwort-Itemtypen: Das Wiki schreibt mal "Weapons", mal "Melee Weapons", mal "Swords / Axes".
// Hier wird jede Angabe auf konkrete Item-Klassen abgebildet, damit man nach seinem Item filtern kann.
const RW_WEAPONS = ['Axe', 'Sword', 'Dagger', 'Club', 'Mace', 'Hammer', 'Scepter', 'Wand', 'Staff', 'Polearm', 'Spear',
  'Amazon Spear', 'Javelin', 'Amazon Javelin', 'Throwing Weapon', 'Bow', 'Crossbow', 'Claw', 'Orb'];
const RW_ARMOR = ['Helm', 'Chest', 'Shield', 'Paladin Shield', 'Quiver'];
const RW_GROUPS = [['Armor', RW_ARMOR], ['Weapons', RW_WEAPONS]];
// Laut Wiki: Melee = alle Nahkampfwaffen inkl. Wands, ohne Orbs; Wurfwaffen werden immer extra genannt
const RW_RANGED = ['Bow', 'Crossbow', 'Orb', 'Javelin', 'Amazon Javelin', 'Throwing Weapon'];
const RW_CLASS = {
  weapons: RW_WEAPONS,
  'melee weapons': RW_WEAPONS.filter(c => !RW_RANGED.includes(c)),
  axes: ['Axe'], swords: ['Sword'], 'two-handed swords': ['Sword'], clubs: ['Club'], 'tipped maces': ['Mace'],
  hammers: ['Hammer'], scepters: ['Scepter'], wands: ['Wand'], staves: ['Staff'], polearms: ['Polearm'],
  spears: ['Spear', 'Amazon Spear'], 'amazon spears': ['Amazon Spear'],
  'throwing weapons': ['Throwing Weapon', 'Javelin', 'Amazon Javelin'], 'amazon throwing weapons': ['Amazon Javelin'],
  bows: ['Bow'], crossbows: ['Crossbow'], claws: ['Claw'], orbs: ['Orb'],
  helms: ['Helm'], chests: ['Chest'], shields: ['Shield', 'Paladin Shield'], 'paladin shields': ['Paladin Shield'],
  quivers: ['Quiver'],
};
// Maximale Sockel pro Klasse (größte Basis laut Wiki "Item_Bases" → Sockets). Ein Runenwort mit mehr
// Runen passt nicht hinein, auch wenn der Item-Typ stimmt (z. B. 6-Sockel-"Weapons"-Runenwort in einem Orb).
const RW_MAX_SOCKETS = {
  Axe: 6, Sword: 6, Dagger: 3, Club: 3, Mace: 5, Hammer: 6, Scepter: 5, Wand: 2, Staff: 6, Polearm: 6, Spear: 6,
  'Amazon Spear': 6, Javelin: 3, 'Amazon Javelin': 3, 'Throwing Weapon': 3, Bow: 6, Crossbow: 6, Claw: 3, Orb: 3,
  Helm: 3, Chest: 4, Shield: 4, 'Paladin Shield': 4, Quiver: 2,
};
const rwClasses = (type, sockets) => {
  const no = (type.match(/\(\s*not?\s+([^)]*)\)/i)?.[1] || '').toLowerCase(); // "(NO BOWS OR CROSSBOWS)"
  const out = new Set();
  for (const part of type.replace(/\([^)]*\)/g, '').split('/')) {
    const k = part.replace(/\*/g, '').trim().toLowerCase();
    if (!k) continue;
    if (!RW_CLASS[k]) console.warn('Unbekannter Runenwort-Itemtyp:', k);
    (RW_CLASS[k] || []).forEach(c => out.add(c));
  }
  return [...out].filter(c => !no.includes(c.toLowerCase()) && sockets <= (RW_MAX_SOCKETS[c] ?? 6));
};
// Kleine Typ-Icons (24×24, Strich in currentColor), eigene Zeichnungen
const ICONS = {
  helm: '<path d="M4 14a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 14h16M12 14v6"/>',
  chest: '<path d="M8 3 4 6v5l2 1v9h12v-9l2-1V6l-4-3"/><path d="M8 3a4 4 0 0 0 8 0"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
  pala: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M12 8v8M9 11h6"/>',
  quiver: '<path d="M8 9h8l-1.5 12h-5z"/><path d="M10 9V4M14 9V4M12 9V3"/>',
  sword: '<path d="M19 3h2v2L10 16l-2-2z"/><path d="m6 12 6 6M5 19l3-3"/>',
  bow: '<path d="M5 3c9 1 15 7 16 16"/><path d="M5 3 21 19"/>',
  staff: '<path d="M5 21 16 8"/><circle cx="18" cy="6" r="3"/>',
  claw: '<path d="M6 20c0-6 2-11 6-15M10 20c0-5 2-9 6-12M14 20c0-4 2-7 5-9"/>',
  axe: '<path d="M4 21 15 10"/><path d="M13 3c4 0 8 4 8 8l-5 1-4-4z"/>',
  mace: '<path d="M4 20 12 12"/><circle cx="15.5" cy="8.5" r="4"/><path d="M15.5 2.5v2M21.5 8.5h-2M19.7 4.3l-1.4 1.4"/>',
  hammer: '<path d="M4 20 12 12"/><path d="m10 7 5-5 7 7-5 5z"/>',
  dagger: '<path d="M17 4h3v3l-6 6-3-3z"/><path d="m9 9 6 6M6 18l3-3"/>',
  throw: '<path d="M18 4h3v3l-5 5-3-3z"/><path d="m11 10 4 4"/><path d="M3 10h5M2 14h5M5 18h4"/>',
  spear: '<path d="M4 20 16 8"/><path d="m21 3-2 7-5-5z"/>',
  polearm: '<path d="M4 21 19 6"/><path d="M14 4c3-1 6 1 6 5l-3 1-4-4z"/><path d="m19 6 2-3"/>',
  xbow: '<path d="M3 9c6-5 12-5 18 0"/><path d="M3 9l9 4 9-4"/><path d="M12 5v16"/>',
  scepter: '<path d="M5 21 13 13"/><path d="m16 4 4 4-4 5-5-5z"/>',
  wand: '<path d="M5 19 15 9"/><path d="M18 2v4M16 4h4M21 9v2M20 10h2"/>',
  orb: '<circle cx="12" cy="10" r="6"/><path d="M12 16v4M9 21h6"/><path d="M9.5 8a3 3 0 0 1 2.5-1.5"/>',
  gloves: '<path d="M7 21v-5l-2-4V7h2v4V4h2v7V3h2v8V5h2v8l2-2 1.5 1.5L14 17v4z"/>',
  boots: '<path d="M7 3h6v9l6 3a2 2 0 0 1 2 2v3H5v-5l2-3z"/><path d="M5 17h16"/>',
  belt: '<rect x="2" y="9" width="20" height="6" rx="1"/><rect x="9" y="7.5" width="6" height="9" rx="1"/><path d="M12 12h3"/>',
  ring: '<circle cx="12" cy="14.5" r="6"/><path d="m12 2.5 3 3-3 3-3-3z"/>',
  amulet: '<path d="M5 3c0 5 3 8 7 9 4-1 7-4 7-9"/><circle cx="12" cy="16.5" r="4"/>',
  charm: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="m12 8 3 4-3 4-3-4z"/>',
  jewel: '<path d="M7 4h10l4 6-9 11-9-11z"/><path d="M3 10h18M12 21 9 10l3-6 3 6z"/>',
};
// Icon eines Unique-Items aus Typ (bzw. Basis bei Klassen- und Sammel-Typen)
const TYPE_ICON = {
  Axe: 'axe', Sword: 'sword', Dagger: 'dagger', Throwing: 'throw', Spear: 'spear', Polearm: 'polearm', Bow: 'bow',
  Crossbow: 'xbow', Scepter: 'scepter', Staff: 'staff', Wand: 'wand', Assassin: 'claw', Sorceress: 'orb', Paladin: 'sword',
  Helm: 'helm', Chest: 'chest', Gloves: 'gloves', Boots: 'boots', Belt: 'belt', Shield: 'shield', 'Bolts/Quivers': 'quiver',
  Ring: 'ring', Amulet: 'amulet', Charm: 'charm', Jewel: 'jewel',
};
const itemIcon = it => {
  const base = it.BaseTypeName || '';
  if (it.Type === 'Mace') return /Hammer|Maul|Mallet|Martel|War Club/.test(base) ? 'hammer' : 'mace';
  if (it.Type === 'Amazon') return /Bow/.test(base) ? 'bow' : /Javelin/.test(base) ? 'throw' : 'spear';
  if (it.Type === 'Shield' && it.Class === 'Paladin') return 'pala';
  return TYPE_ICON[it.Type] || 'sword';
};
const icon = k => `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ''}</svg>`;
// Icon eines Runenworts aus seinen passenden Item-Klassen
const rwIcon = fits => {
  const only = list => fits.length && fits.every(c => list.includes(c));
  if (only(['Helm'])) return 'helm';
  if (only(['Chest'])) return 'chest';
  if (only(['Paladin Shield'])) return 'pala';
  if (only(['Shield', 'Paladin Shield'])) return 'shield';
  if (only(['Quiver'])) return 'quiver';
  if (only(['Bow', 'Crossbow'])) return 'bow';
  if (only(['Wand'])) return 'wand';
  if (only(['Staff', 'Wand', 'Orb'])) return 'staff';
  if (only(['Claw'])) return 'claw';
  if (only(['Hammer'])) return 'hammer';
  if (only(['Scepter'])) return 'scepter';
  if (only(['Throwing Weapon', 'Javelin', 'Amazon Javelin'])) return 'throw';
  if (only(['Polearm', 'Spear', 'Amazon Spear', 'Staff'])) return 'polearm';
  return 'sword';
};
const CU_ORDER = ['Sockets', 'Reroll', 'Potions', 'Portals', 'Breakdown', 'Uber Bosses', 'Respecc'];
// Größte Zahl in Angaben wie "6-6.5" oder "17-19" (zum Sortieren), -1 wenn keine
const maxNum = s => Math.max(...(String(s || '').match(/\d+(\.\d+)?/g) || [-1]).map(Number));
const load = n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); });

function app() {
  return {
    tabs: TABS, fmt, fmtResult, fmtMod, icon, RESIST_COLOR, RW_GROUPS,
    tab: 'runewords', loading: true, error: '',
    runewords: [], craft: { types: [], slots: [] }, recipes: [], corruptions: [], weapons: [], armor: [], accessories: [], bosses: [],

    // Zustand der Filter pro Bereich
    rw: { q: '', sockets: '', rune: '', type: '', sort: 'level' },
    cu: { q: '' },
    cr: { q: '', type: '', slot: '' },
    co: { q: '', cat: '' },
    uw: { q: '', type: '', hand: '', sort: 'level' },
    ua: { q: '', type: '', tier: '', sort: 'level' },
    ux: { q: '', type: '', sort: 'level' },
    boss: 0,
    scale: 100, // Größe des Inhaltsbereichs in %, Slider oben rechts
    font: 'Inter', // Schriftauswahl neben dem Slider (Optionen in index.html)
    showBase: false, // Basiswerte (Damage, Defense …) bei Unique Weapons/Armor einblenden
    get fontStack() {
      return (this.font === 'System' ? '' : `"${this.font}", `) + 'system-ui, -apple-system, "Segoe UI", sans-serif';
    },

    async init() {
      // Slider-Wert pro Browser merken (localStorage kann z. B. im privaten Modus fehlen)
      try { this.scale = Number(localStorage.getItem('pd2-scale')) || 100; } catch {}
      this.$watch('scale', v => { try { localStorage.setItem('pd2-scale', v); } catch {} });
      try { this.font = localStorage.getItem('pd2-font') || 'Inter'; } catch {}
      this.$watch('font', v => { try { localStorage.setItem('pd2-font', v); } catch {} });
      try { this.showBase = localStorage.getItem('pd2-base') === '1'; } catch {}
      this.$watch('showBase', v => { try { localStorage.setItem('pd2-base', v ? '1' : '0'); } catch {} });
      const route = () => { const h = location.hash.slice(1); this.tab = TABS.some(t => t[0] === h) ? h : 'runewords'; };
      route(); addEventListener('hashchange', route);
      try {
        const [rw, cr, cu, co, uw, ua, ux, bo] = await Promise.all(['runewords', 'crafting', 'cuberecipes', 'corruptions', 'uniqueweapons', 'uniquearmor', 'uniqueaccessories', 'uberbosses'].map(load));
        this.runewords = rw.Runewords.map(r => {
          const Fits = rwClasses(r.ItemType.trim(), r.Sockets);
          return {
            ...r,
            ItemType: r.ItemType.trim(),
            Fits,
            Icon: rwIcon(Fits),
            Runes: [1, 2, 3, 4, 5, 6].map(i => r['Rune' + i]).filter(Boolean),
          };
        });
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
        this.weapons = uw.Weapons.map(w => ({ ...w, Icon: itemIcon(w) }));
        this.armor = ua.Armor.map(a => ({ ...a, Icon: itemIcon(a) }));
        this.accessories = ux.Accessories.map(a => ({ ...a, Icon: itemIcon(a) }));
        this.bosses = bo.bosses;
      } catch (e) {
        this.error = 'Daten konnten nicht geladen werden. Bitte die Seite über einen Webserver öffnen (siehe README).';
        console.error(e);
      } finally { this.loading = false; }
    },

    // ---------- Runewords ----------
    get rwList() {
      const f = this.rw;
      const list = this.runewords.filter(r =>
        (!f.sockets || r.Sockets == f.sockets) &&
        (!f.type || r.Fits.includes(f.type)) &&
        has(r.Runes.join(' '), f.rune) &&
        has([r.Name, r.ItemType, ...r.Fits, ...r.Runes, ...r.Bonuses].join(' '), f.q));
      const by = { name: (a, b) => a.Name.localeCompare(b.Name), level: (a, b) => a.CharacterLevel - b.CharacterLevel, sockets: (a, b) => a.Sockets - b.Sockets };
      return by[f.sort] ? list.sort(by[f.sort]) : list;
    },
    resetRw() { this.rw = { q: '', sockets: '', rune: '', type: '', sort: 'level' }; },

    // ---------- Cube ----------
    get cuList() {
      return this.recipes.filter(r => has([r.Result, r.Notes, r.Category, ...r.Ingridients.map(i => i.name + ' ' + i.info)].join(' '), this.cu.q));
    },
    // Rezepte als Abschnitte pro Kategorie; bekannte Kategorien in fester Reihenfolge, neue hinten dran
    get cuGroups() {
      const cats = [...new Set([...CU_ORDER, ...this.recipes.map(r => r.Category)])];
      return cats
        .map(c => ({ name: c, id: 'cube-' + c.toLowerCase().replace(/\W+/g, '-'), rows: this.cuList.filter(r => r.Category === c) }))
        .filter(g => g.rows.length);
    },
    jumpTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); },

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
        const [lo, mid, hi] = c.Chances || [50, 30, 20]; // Waffen 50/30/20, sonst 48/32/20 (laut Wiki)
        const cols = [['Low rarity', lo, pick(c.LowRarity)], ['Mid rarity', mid, pick(c.MidRarity)], ['High rarity', hi, pick(c.HighRarity)]];
        return { name: c.Category, cols, hits: cols.reduce((n, x) => n + x[2].length, 0) };
      }).filter(c => c.hits);
    },

    // ---------- Unique Weapons ----------
    get uwTypes() { return [...new Set(this.weapons.map(w => w.Type))].sort(); },
    get uwHands() { return [...new Set(this.weapons.map(w => w.Hander))].sort(); },
    get uwList() {
      const f = this.uw;
      const list = this.weapons.filter(w =>
        (!f.type || w.Type === f.type) && (!f.hand || w.Hander === f.hand) &&
        has([w.Name, w.Type, w.BaseTypeName, ...w.Bonuses].join(' '), f.q));
      // Ohne Level (Quest-Waffen) bzw. ohne Schadenswert landen am Ende
      const lvl = w => w.RequiredLevel ?? 999;
      const dmg = w => maxNum(w['Average Damage']);
      const by = { name: (a, b) => a.Name.localeCompare(b.Name), level: (a, b) => lvl(a) - lvl(b), damage: (a, b) => dmg(b) - dmg(a) };
      return by[f.sort] ? list.sort(by[f.sort]) : list;
    },
    resetUw() { this.uw = { q: '', type: '', hand: '', sort: 'level' }; },
    uwStats(w) {
      return [['Base', w.BaseTypeName], ['Hands', w.Hander], ['Damage', w.Damage], ['Avg. damage', w['Average Damage']],
        ['Base damage', w['Base-Damage']], ['Speed', w['Base-Speed']], ['Range', w['Base-Melee Range']], ['Max. sockets', w['Base-Maximum Sockets']]]
        .filter(x => x[1]);
    },

    // ---------- Unique Armor ----------
    get uaTypes() { return [...new Set(this.armor.map(a => a.Type))]; }, // Reihenfolge wie im Wiki: Helm, Chest, …
    get uaList() {
      const f = this.ua;
      const list = this.armor.filter(a =>
        (!f.type || a.Type === f.type) && (!f.tier || a.Tier === f.tier) &&
        has([a.Name, a.Type, a.BaseTypeName, a.Class, ...a.Bonuses].join(' '), f.q));
      const by = { name: (a, b) => a.Name.localeCompare(b.Name), level: (a, b) => a.RequiredLevel - b.RequiredLevel, defense: (a, b) => maxNum(b.Defense) - maxNum(a.Defense) };
      return by[f.sort] ? list.sort(by[f.sort]) : list;
    },
    resetUa() { this.ua = { q: '', type: '', tier: '', sort: 'level' }; },
    uaStats(a) {
      return [['Base', a.BaseTypeName], ['Tier', a.Tier], ['Class', a.Class && a.Class + ' only'], ['Defense', a.Defense],
        ['Base defense', a['Base-Defense']], ['Block', a.Block], ['Base block', a['Base-Block']], ['Smite damage', a['Base-Smite Damage']],
        ['Kick damage', a['Base-Kick Damage']], ['Potion rows', a['Base-Potion Rows']], ['Speed penalty', a['Base-Speed Penalty']],
        ['Max. sockets', a['Base-Maximum Sockets']], ['Req. strength', a.RequiredStrength]]
        .filter(x => x[1]);
    },

    // ---------- Unique Accessories ----------
    get uxTypes() { return [...new Set(this.accessories.map(a => a.Type))]; }, // Ring, Amulet, Charm, Jewel
    get uxList() {
      const f = this.ux;
      const list = this.accessories.filter(a =>
        (!f.type || a.Type === f.type) &&
        has([a.Name, a.Type, a.BaseTypeName, a.Class, ...a.Bonuses].join(' '), f.q));
      // Ohne Level (Quest-Amulett) landet am Ende
      const lvl = a => a.RequiredLevel ?? 999;
      const by = { name: (a, b) => a.Name.localeCompare(b.Name), level: (a, b) => lvl(a) - lvl(b) };
      return by[f.sort] ? list.sort(by[f.sort]) : list;
    },
    resetUx() { this.ux = { q: '', type: '', sort: 'level' }; },
  };
}
