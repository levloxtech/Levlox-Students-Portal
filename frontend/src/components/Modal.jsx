import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'info', // 'info', 'success', 'warning', 'error'
  confirmText, 
  cancelText, 
  onConfirm,
  size = 'md' // 'sm', 'md', 'lg'
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="modal-type-icon text-success" size={24} />;
      case 'warning':
        return <AlertCircle className="modal-type-icon text-warning" size={24} />;
      case 'error':
        return <AlertCircle className="modal-type-icon text-danger" size={24} />;
      default:
        return <Info className="modal-type-icon text-primary" size={24} />;
    }
  };

  const sizeClasses = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${sizeClasses[size]} animate-scale-up`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-container">
            {getIcon()}
            <h3 className="modal-title">{title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {(confirmText || cancelText) && (
          <div className="modal-footer">
            {cancelText && (
              <button className="btn btn-outline" onClick={onClose}>
                {cancelText}
              </button>
            )}
            {confirmText && (
              <button 
                className={`btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
