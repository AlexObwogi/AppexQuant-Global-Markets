/**
 * AppexQuant Markets Global - Modal & Drawer Overlay Components
 */

import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalVariants } from '../../design/motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, id }) => {
  const modalId = id || `modal-${Math.random().toString(36).substring(2, 8)}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id={modalId} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-main/80 backdrop-blur-sm"
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg bg-white dark:bg-[#131822] border border-slate-200 dark:border-border-color rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-border-color/80 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-text-secondary hover:text-bg-main dark:text-text-secondary dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-bg-hover rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-slate-700 dark:text-text-primary">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'bottom' | 'right';
  id?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, side = 'bottom', id }) => {
  const drawerId = id || `drawer-${Math.random().toString(36).substring(2, 8)}`;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sideVariants = {
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id={drawerId} className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-main/80 backdrop-blur-sm"
          />
          <motion.div
            initial={sideVariants[side].initial}
            animate={sideVariants[side].animate}
            exit={sideVariants[side].exit}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed z-10 bg-white dark:bg-[#131822] border-slate-200 dark:border-border-color p-6 shadow-2xl flex flex-col ${
              side === 'bottom'
                ? 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t'
                : 'top-0 right-0 bottom-0 w-full max-w-sm rounded-l-3xl border-l'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-border-color/80 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 text-text-secondary hover:text-bg-main dark:text-text-secondary dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-bg-hover rounded-lg cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto text-slate-700 dark:text-text-primary">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
