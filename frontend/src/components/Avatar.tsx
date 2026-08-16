'use client';

// Avatar mit Standard-Profilbild: Zeigt das hochgeladene Profilbild, falls
// vorhanden. Andernfalls wird automatisch ein generiertes Standardbild
// (Initialen + deterministische Farbe aus dem Namen) angezeigt. Falls das
// Bild nicht geladen werden kann, fällt es ebenfalls auf das Standardbild
// zurück.
import { useState } from 'react';
import { avatarSrc } from './SessionProvider';

/** Initialen aus Name/E-Mail ableiten (max. 2 Zeichen). */
export function initialsOf(name?: string | null): string {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Farbpalette für generierte Avatare (harmonisch, gut lesbar)
const AVATAR_COLORS = [
  ['#7c3aed', '#a78bfa'], // violet
  ['#0ea5e9', '#7dd3fc'], // sky
  ['#059669', '#6ee7b7'], // emerald
  ['#d97706', '#fcd34d'], // amber
  ['#dc2626', '#fca5a5'], // red
  ['#4f46e5', '#a5b4fc'], // indigo
  ['#db2777', '#f9a8d4'], // pink
  ['#0891b2', '#67e8f9'], // cyan
];

/** Deterministische Farbe aus einem String hashen (gleicher Name = gleiche Farbe). */
function colorPairFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as [string, string];
}

/**
 * Standard-Profilbild als Inline-SVG data-URI generieren.
 * Zeigt die Initialen auf einem farbigen Verlaufs-Hintergrund.
 */
export function defaultAvatarDataUri(name?: string | null): string {
  const seed = (name || '?').trim() || '?';
  const initials = initialsOf(seed);
  const [from, to] = colorPairFor(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
    `<text x="64" y="64" font-family="Inter, system-ui, -apple-system, sans-serif" ` +
    `font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">` +
    `${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type AvatarProps = {
  /** avatarUrl aus der API ("avatar:<key>" oder absolute URL) oder null/undefined. */
  avatarUrl?: string | null;
  name?: string | null;
  /** Grösse in Pixeln (quadratisch). */
  size?: number;
  className?: string;
  /**
   * Avatar-Endpunkt für andere Nutzer (z. B. "/api/users/<id>/avatar").
   * Standard: "/api/users/me/avatar" (eigener Avatar).
   */
  endpoint?: string;
};

export function Avatar({ avatarUrl, name, size = 40, className = '', endpoint }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolved = avatarSrc(avatarUrl, endpoint);
  const showImage = resolved && !failed;

  return showImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={defaultAvatarDataUri(name)}
      alt=""
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}