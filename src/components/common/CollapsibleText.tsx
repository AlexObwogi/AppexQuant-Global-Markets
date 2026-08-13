/**
 * AppexQuant Markets Global - Collapsible Text Component
 * Mobile Rule 5: Long descriptions should be collapsible to avoid vertical layout bloat.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTextProps {
  text: string;
  maxChars?: number;
  className?: string;
}

export const CollapsibleText: React.FC<CollapsibleTextProps> = ({
  text,
  maxChars = 110,
  className = 'text-xs text-text-secondary leading-relaxed',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.length <= maxChars) {
    return <p className={className}>{text}</p>;
  }

  const truncated = text.slice(0, maxChars) + '...';

  return (
    <div className="space-y-1">
      <p className={className}>{isExpanded ? text : truncated}</p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="text-[11px] font-mono text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer transition-colors pt-0.5"
      >
        <span>{isExpanded ? 'Show less' : 'Read more'}</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  );
};
