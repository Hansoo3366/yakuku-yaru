'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

type AdminDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** sheet: 오른쪽에서 열리는 상세 패널(모바일은 아래에서). center: 가운데 작은 창. */
  variant?: 'sheet' | 'center';
  role?: 'dialog' | 'alertdialog';
  /** 바깥(배경)을 눌러도 닫히지 않게 한다. 입력 중인 폼에 쓴다. */
  dismissOnBackdrop?: boolean;
};

/**
 * 브라우저 기본 <dialog>.showModal() 을 쓴다. 포커스 가두기·Esc 닫기·최상위 레이어를
 * 브라우저가 맡으므로 표 안의 스크롤 영역에 잘리지 않는다.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  variant = 'sheet',
  role = 'dialog',
  dismissOnBackdrop = true,
}: AdminDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onCloseRef.current();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  return (
    <dialog
      aria-labelledby={titleId}
      className={`admin-dialog admin-dialog--${variant}`}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
      ref={dialogRef}
      role={role}
    >
      {open ? (
        <div className="admin-dialog-panel">
          <header className="admin-dialog-head">
            <div>
              {eyebrow ? <span className="admin-dialog-eyebrow">{eyebrow}</span> : null}
              <h2 id={titleId}>{title}</h2>
            </div>
            <button
              aria-label="닫기"
              className="admin-icon-btn"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </header>
          {children ? <div className="admin-dialog-body">{children}</div> : null}
          {footer ? <footer className="admin-dialog-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
