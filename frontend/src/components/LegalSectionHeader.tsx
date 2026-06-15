export function LegalSectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex-none mt-0.5 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center leading-none shrink-0">
        {num}
      </span>
      <h2 className="text-xl font-semibold text-foreground leading-snug">{title}</h2>
    </div>
  );
}
