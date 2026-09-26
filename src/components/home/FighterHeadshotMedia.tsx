import FighterPortrait from "@/components/ui/FighterPortrait";

type Props = {
  imageUrl: string | null;
  fighterName: string;
  fighterSlug?: string | null;
  corner: "A" | "B";
};

export default function FighterHeadshotMedia({ imageUrl, fighterName, fighterSlug, corner }: Props) {
  return (
    <div className={`absolute inset-x-0 bottom-0 top-4 ${corner === "A" ? "sm:translate-x-[10%]" : "sm:-translate-x-[10%]"}`}>
      <FighterPortrait imageUrl={imageUrl} fighterName={fighterName} fighterSlug={fighterSlug}
        sizes="(max-width: 640px) 50vw, 520px" loading="eager" />
    </div>
  );
}
