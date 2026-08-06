// Grade de carimbos — o elemento-assinatura do app, inspirado no cartão físico.
export function LoyaltyCard({
  stamps,
  required,
  rewardText,
  justStamped,
}: {
  stamps: number;
  required: number;
  rewardText: string;
  justStamped?: boolean;
}) {
  const slots = Array.from({ length: required });
  return (
    <div className="night-sky rounded-card p-5 shadow-xl">
      <div className="mb-4 rounded-lg bg-brand-secondary px-3 py-2 text-center">
        <p className="font-display text-lg font-bold leading-tight text-brand-primary">
          A cada {required} refeições
        </p>
        <p className="text-sm italic text-brand-primary/80">{rewardText}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {slots.map((_, i) => {
          const filled = i < stamps;
          const isNewest = filled && i === stamps - 1;
          return (
            <div
              key={i}
              className={`stamp-slot flex aspect-square items-center justify-center bg-white ${
                justStamped && isNewest ? "stamp-pop" : ""
              }`}
            >
              {filled ? (
                <span className="font-display text-2xl font-black text-brand-primary">
                  ✓
                </span>
              ) : (
                <span className="text-xs font-medium text-neutral-300">
                  {i + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm font-medium text-white/80">
        {stamps} de {required} carimbos
        {stamps === 0 && " — comece hoje!"}
      </p>
    </div>
  );
}
