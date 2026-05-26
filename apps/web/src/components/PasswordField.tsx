'use client';

import { useId, useState, type CompositionEvent, type ReactNode } from 'react';
import { normalizePasswordInput } from '@/lib/korean-to-qwerty';

type PasswordFieldProps = {
  autoComplete?: string;
  id?: string;
  label: string;
  labelAside?: ReactNode;
  maxLength?: number;
  minLength?: number;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
};

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path
          d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 8-1.02 2.84-2.88 5.08-5.1 6.42M6.1 6.1C3.73 7.56 2.04 9.58 1 12c1.73 4.89 6 8 11 8 1.55 0 3.03-.32 4.38-.9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function PasswordField({
  autoComplete,
  id: idProp,
  label,
  labelAside,
  maxLength,
  minLength,
  name,
  onChange,
  placeholder,
  required,
  value,
}: PasswordFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [visible, setVisible] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  function handleValueChange(nextValue: string) {
    onChange(normalizePasswordInput(nextValue));
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    setIsComposing(false);
    handleValueChange(event.currentTarget.value);
  }

  return (
    <div className="field">
      {labelAside ? (
        <div className="field-label-row">
          <label className="field-label" htmlFor={id}>
            {label}
          </label>
          {labelAside}
        </div>
      ) : (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="password-input-wrap">
        <input
          autoComplete={autoComplete}
          autoCorrect="off"
          className="form-input"
          id={id}
          lang="en"
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          onChange={(event) => {
            if (!isComposing) {
              handleValueChange(event.target.value);
            }
          }}
          onCompositionEnd={handleCompositionEnd}
          onCompositionStart={() => setIsComposing(true)}
          placeholder={placeholder}
          required={required}
          spellCheck={false}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <EyeIcon hidden={visible} />
        </button>
      </div>
    </div>
  );
}
