// Logo MAPPER — 4 barras coloridas (verde, âmbar, magenta, azul).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="6" width="42" height="7.5" rx="3.75" fill="#6CB33F" />
      <rect x="3" y="16.25" width="42" height="7.5" rx="3.75" fill="#F2A93B" />
      <rect x="3" y="26.5" width="42" height="7.5" rx="3.75" fill="#E0218A" />
      <rect x="3" y="36.75" width="42" height="7.5" rx="3.75" fill="#1B75BB" />
    </svg>
  );
}

export function Logo({ size = 32, withText = true, subtitle, mark = true }: { size?: number; withText?: boolean; subtitle?: string; mark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {mark && <LogoMark size={size} />}
      {withText && (
        <div className="leading-none">
          <div className="font-extrabold tracking-tight text-fg" style={{ fontSize: size * 0.62 }}>MAPPER</div>
          {subtitle && <div className="text-xs uppercase tracking-wider text-muted mt-0.5">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
