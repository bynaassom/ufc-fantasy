export default function EventBonusLabel({ overlay = false }: { overlay?: boolean }) {
  return (
    <span
      className="inline-flex items-center border px-2 py-1 font-condensed text-[11px] font-900 uppercase tracking-[0.14em]"
      style={
        overlay
          ? {
              backgroundColor: "rgba(10,10,10,0.78)",
              borderColor: "rgba(255,255,255,0.5)",
              color: "white",
            }
          : {
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--red)",
              color: "var(--red)",
            }
      }
    >
      Bônus · não soma no acumulado
    </span>
  );
}
