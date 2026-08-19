const fs = require('fs');

const content = `import React from 'react';
import { useGlobalState } from '../../state/GlobalStateContext.tsx';
import { getEffectiveTheme } from '../../design/theme.ts';
import { Sun, Moon } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { state, dispatch } = useGlobalState();
  const effectiveTheme = getEffectiveTheme(state.theme);

  const handleToggle = () => {
    dispatch({ type: 'SET_THEME', payload: effectiveTheme === 'light' ? 'dark' : 'light' });
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center p-2 rounded-lg bg-bg-surface border border-border-color hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
      title={\`Switch to \${effectiveTheme === 'light' ? 'Dark' : 'Light'} Mode\`}
    >
      {effectiveTheme === 'light' ? (
        <Sun className="w-4 h-4 text-accent-primary" />
      ) : (
        <Moon className="w-4 h-4 text-accent-primary" />
      )}
    </button>
  );
};
`;

fs.writeFileSync('src/components/common/ThemeSelector.tsx', content);
console.log("Rewrote ThemeSelector.tsx");
