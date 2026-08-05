type RebelLogoProps = {
  className?: string;
  priority?: boolean;
  /** Use on dark backgrounds (hero). Default is for light surfaces (header, footer). */
  variant?: "default" | "onDark";
};

export function RebelLogo({
  className = "h-16 w-auto",
  priority,
  variant = "default",
}: RebelLogoProps) {
  const src =
    variant === "onDark" ? "/rebel-logo-on-dark.svg" : "/rebel-logo.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Rebel Marketing"
      width={480}
      height={120}
      className={className}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
