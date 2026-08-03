import styles from './AdminBadge.module.css';

type AdminBadgeProps = {
  inverse?: boolean;
};

export function AdminBadge({ inverse = false }: AdminBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${inverse ? styles.inverse : ''}`}
      title="서비스 관리자"
    >
      관리자
    </span>
  );
}
