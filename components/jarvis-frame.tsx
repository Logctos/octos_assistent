export function JarvisFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`jarvis-frame flex items-center justify-center ${className}`}>
      <div className="jarvis-backdrop" />
      <div className="jarvis-ring jarvis-ring--outer" />
      <div className="jarvis-ring jarvis-ring--mid" />
      <div className="relative z-10 flex h-full w-full items-center justify-center">{children}</div>
    </div>
  );
}
