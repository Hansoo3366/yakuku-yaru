'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AdminDialog } from './AdminDialog';

type ToastTone = 'success' | 'error';

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** danger 면 확인 버튼이 빨간색이다. 되돌릴 수 없는 작업에 쓴다. */
  tone?: 'danger' | 'default';
};

type FeedbackContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
  notifyError: (error: unknown, fallback: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useAdminFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error('useAdminFeedback 은 AdminFeedbackProvider 안에서만 쓸 수 있습니다.');
  }
  return value;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 작업 결과 알림(토스트)과 확인 창. 브라우저 alert/confirm 대신 쓴다. */
export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const nextIdRef = useRef(1);
  const toastLayerRef = useRef<HTMLDivElement>(null);

  // 알림은 popover(최상위 레이어)로 띄운다. 상세 패널(dialog)이 열려 있어도 그 위에 보이도록
  // 새 알림이 올 때마다 다시 띄워 맨 위로 올린다.
  useEffect(() => {
    const layer = toastLayerRef.current;
    if (!layer || typeof layer.showPopover !== 'function') return;
    if (layer.matches(':popover-open')) layer.hidePopover();
    if (toasts.length) layer.showPopover();
  }, [toasts]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const notifyError = useCallback(
    (error: unknown, fallback: string) => notify(errorMessage(error, fallback), 'error'),
    [notify],
  );

  const settleConfirm = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPendingConfirm(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolverRef.current?.(false);
    setPendingConfirm(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(
    () => ({ confirm, notify, notifyError }),
    [confirm, notify, notifyError],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <AdminDialog
        eyebrow="확인"
        footer={
          <>
            <button
              autoFocus
              className="btn btn-secondary"
              onClick={() => settleConfirm(false)}
              type="button"
            >
              취소
            </button>
            <button
              className={`btn ${pendingConfirm?.tone === 'default' ? 'btn-primary' : 'admin-btn-danger'}`}
              onClick={() => settleConfirm(true)}
              type="button"
            >
              {pendingConfirm?.confirmLabel ?? '삭제'}
            </button>
          </>
        }
        onClose={() => settleConfirm(false)}
        open={Boolean(pendingConfirm)}
        role="alertdialog"
        title={pendingConfirm?.title ?? ''}
        variant="center"
      >
        {pendingConfirm?.description ? (
          <div className="admin-confirm-text">{pendingConfirm.description}</div>
        ) : null}
      </AdminDialog>

      <div
        aria-live="polite"
        className="admin-toasts"
        popover="manual"
        ref={toastLayerRef}
        role="status"
      >
        {toasts.map((toast) => (
          <div className="admin-toast" data-tone={toast.tone} key={toast.id}>
            {toast.tone === 'error' ? (
              <CircleAlert aria-hidden="true" size={18} />
            ) : (
              <CircleCheck aria-hidden="true" size={18} />
            )}
            <p>{toast.message}</p>
            <button
              aria-label="알림 닫기"
              className="admin-icon-btn admin-icon-btn--sm"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
