type RebelLogoProps = {
  className?: string;
  priority?: boolean;
};

export function RebelLogo({ className = "h-16 w-auto", priority }: RebelLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rebel-logo.svg"
      alt="Rebel Marketing"
      width={480}
      height={120}
      className={className}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
