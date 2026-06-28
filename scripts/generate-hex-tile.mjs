import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Flat-top honeycomb: each cell is one closed hex (fill + stroke). */
const R = 18;
const H = (R * Math.sqrt(3)) / 2;
const tileW = 3 * R;
const tileH = 2 * H;
const tileWR = +tileW.toFixed(3);
const tileHR = +tileH.toFixed(3);
const cellFill = '#06080c';
const stroke = '#22d3ee';
const STROKE_WIDTH = 1.75;
const STROKE_OPACITY = 0.58;
const GLOW = 0.35;

function flatTopCorners(cx, cy) {
  return [
    [cx + R, cy],
    [cx + R / 2, cy + H],
    [cx - R / 2, cy + H],
    [cx - R, cy],
    [cx - R / 2, cy - H],
    [cx + R / 2, cy - H],
  ];
}

function polygonPoints(pts) {
  return pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
}

const centers = [
  [-R, H],
  [R, H],
  [3 * R, H],
  [0.5 * R, 2 * H],
  [2.5 * R, 2 * H],
  [4.5 * R, 2 * H],
];

const polygons = centers
  .map(([cx, cy]) => `    <polygon points="${polygonPoints(flatTopCorners(cx, cy))}"/>`)
  .join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${tileWR}" height="${tileHR}" viewBox="0 0 ${tileWR} ${tileHR}" overflow="hidden">
  <defs>
    <filter id="sdb-hex-glow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${GLOW}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g fill="${cellFill}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}" stroke-opacity="${STROKE_OPACITY}"
     stroke-linejoin="round" filter="url(#sdb-hex-glow)">
${polygons}
  </g>
</svg>
`;

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'ui', 'hex-tile.svg');
writeFileSync(out, svg);
console.log(`Wrote ${out} (flat-top ${tileWR}×${tileHR}, R=${R}, ${centers.length} closed hexes)`);
