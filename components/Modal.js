'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ id, title, subtitle, children, footer, onClose, busy = false, wide = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    const element = dialog.current;
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialog} id={id} className={`studio-modal ${wide ? 'studio-modal-wide' : ''}`}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-subtitle`}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget || busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="modal-header"><div><h2 className="modal-title" id={`${id}-title`}>{title}</h2><p id={`${id}-subtitle`}>{subtitle}</p></div>
        <button type="button" className="btn-close" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} disabled={busy} />
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </dialog>, document.body,
  );
}
