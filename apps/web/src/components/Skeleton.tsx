type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
};

export function Skeleton({ width, height, radius }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className="skeleton"
      style={{
        display: 'block',
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius: radius ?? 6,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          height={index === 0 ? 18 : 14}
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}
