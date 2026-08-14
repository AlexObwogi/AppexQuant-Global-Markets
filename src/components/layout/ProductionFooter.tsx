/**
 * AppexQuant Markets Global - Production Dynamic Copyright Footer
 * Strict Implementation of Dynamic Year & Clean Institutional Typography
 */

import React, { useEffect } from 'react';

export const ProductionFooter: React.FC = () => {
  useEffect(() => {
    const el = document.getElementById('copyright-year');
    if (el) {
      el.textContent = new Date().getFullYear().toString();
    }
  }, []);

  return (
    <footer className="w-full py-4 border-t border-border-color bg-bg-nav/95 backdrop-blur-sm text-center text-xs text-text-secondary select-none">
      <p className="font-mono tracking-wide">
        &copy; <span id="copyright-year">{new Date().getFullYear()}</span> AppexQuant Global Markets. All Rights Reserved.
      </p>
    </footer>
  );
};
