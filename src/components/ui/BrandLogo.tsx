import Image from "next/image";

export default function BrandLogo({
  className = "h-5 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className="relative inline-flex">
      <Image src="/logo-dark.svg" alt="UFC Fantasy" width={113} height={20} style={{ width: "auto" }} className={`brand-logo-dark ${className}`} priority={priority} />
      <Image src="/logo-light.svg" alt="" aria-hidden width={114} height={20} style={{ width: "auto" }} className={`brand-logo-light ${className}`} priority={priority} />
    </span>
  );
}
