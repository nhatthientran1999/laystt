type Props = { size?: number; withText?: boolean; subtitle?: string };

export function Logo({ size = 36, withText = true, subtitle = "Smart Queue" }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="bg-gradient-primary shadow-soft grid place-items-center rounded-xl text-primary-foreground font-bold"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        Q
      </div>
      {withText && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-tight">QMS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
}
