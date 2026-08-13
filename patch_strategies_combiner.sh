#!/bin/bash
sed -i '12i import { StrategyCombinerModal } from "../components/strategy/StrategyCombinerModal";' src/views/StrategiesView.tsx
sed -i '24i \ \ const [isCombinerOpen, setIsCombinerOpen] = useState(false);' src/views/StrategiesView.tsx

# Find <button onClick={() => { setEditingStrategy(null); setIsBuilderOpen(true); }}
sed -i '/<span>Quick Strategy<\/span>/i \            <button onClick={() => setIsCombinerOpen(true)} className="px-3 py-2 rounded-[4px] bg-bg-main hover:bg-bg-hover text-text-primary border border-border-color font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer mr-2"><GitMerge className="w-3.5 h-3.5 text-accent-primary" /><span>Combine</span></button>' src/views/StrategiesView.tsx

# Also import GitMerge in lucide-react import
sed -i 's/Code2, Plus/Code2, Plus, GitMerge/g' src/views/StrategiesView.tsx

# Add the combiner modal at the bottom
sed -i '/<StrategyBuilderModal/i \      <StrategyCombinerModal isOpen={isCombinerOpen} onClose={() => setIsCombinerOpen(false)} strategies={strategies} onCombine={handleSaveStrategy} />' src/views/StrategiesView.tsx

