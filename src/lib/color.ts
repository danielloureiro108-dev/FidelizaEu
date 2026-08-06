// "26 35 92" <-> "#1a235c" — cores de marca são guardadas como "R G B".
export function rgbToHex(rgb: string): string {
  const [r, g, b] = rgb.split(" ").map((n) => parseInt(n, 10) || 0);
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
