// Icônes en SVG inline (trait 1.8, couleur héritée).
const s = (d, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICONS = {
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  speaker: s('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  speakerOff: s('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  pin: s('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/><path d="M3 21h18" opacity=".5"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  camera: s('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  mic: s('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  dots: s('<circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>'),
  pause: s('<path d="M9 6v12M15 6v12"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  star: s('<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor" stroke="none"/>'),
  chat: s('<path d="M4 5h16v11H8l-4 4z"/>'),
  search: s('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
  home: s('<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>'),
  land: s('<path d="M3 18l5-8 4 5 3-4 6 7z"/>'),
  send: s('<path d="M4 12l16-8-6 16-2-6z"/>'),
};

// Logo My Key AI : boucles calligraphiques entrelacées (dessin original).
let logoN = 0;
export const logoSwirl = () => {
  const id = "mkg" + ++logoN;
  return `
<svg viewBox="0 0 330 100" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#2fbf3a"/><stop offset=".5" stop-color="#9dff86"/><stop offset="1" stop-color="#2fbf3a"/>
    </linearGradient>
  </defs>
  <g stroke="url(#${id})" stroke-linecap="round"><path d="M10 84 C 48 84, 114 14, 92 12 C 72 10, 60 56, 126 80 C 128 84, 194 14, 172 12 C 152 10, 140 56, 206 80 C 208 84, 274 14, 252 12 C 232 10, 220 56, 286 80 S 306 60, 316 54" stroke-width="3.4" opacity="1"/><path d="M15 87 C 53 87, 119 17, 97 15 C 77 13, 65 59, 131 83 C 133 87, 199 17, 177 15 C 157 13, 145 59, 211 83 C 213 87, 279 17, 257 15 C 237 13, 225 59, 291 83 S 311 63, 321 57" stroke-width="1.4" opacity="0.7"/><path d="M6 88 C 44 88, 110 18, 88 16 C 68 14, 56 60, 122 84 C 124 88, 190 18, 168 16 C 148 14, 136 60, 202 84 C 204 88, 270 18, 248 16 C 228 14, 216 60, 282 84 S 302 64, 312 58" stroke-width="1" opacity="0.45"/></g>
</svg>`;
};

export const TYPE_ICON = {
  Terrain: ICONS.land,
  default: ICONS.home,
};
