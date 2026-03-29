import React, { useId } from 'react';

const TRACK = {
  small: 'h-6 w-11 min-w-[2.75rem]',
  default: 'h-7 w-12 min-w-[3rem]',
  large: 'h-8 w-14 min-w-[3.5rem]',
};

const THUMB = {
  small: 'h-5 w-5',
  default: 'h-5 w-5',
  large: 'h-6 w-6',
};

/**
 * Accessible switch: button role="switch", focus ring, deterministic thumb travel.
 */
const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  size = 'default',
  id,
  'aria-label': ariaLabel,
}) => {
  const autoId = useId();
  const sid = id || autoId;

  return (
    <button
      type="button"
      id={sid}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 rounded-full border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark ${TRACK[size] || TRACK.default} ${
        checked ? 'bg-primary' : 'bg-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-[left,right] duration-200 ease-out ${
          THUMB[size] || THUMB.default
        }`}
        style={
          checked
            ? { left: 'auto', right: '0.125rem' }
            : { left: '0.125rem', right: 'auto' }
        }
        aria-hidden
      />
    </button>
  );
};

export default ToggleSwitch;
