#!/bin/bash
sed -i '11i import { StrategyDetailView } from "./StrategyDetailView";' src/views/StrategiesView.tsx
sed -i '23i \ \ const [selectedDetailStrategy, setSelectedDetailStrategy] = useState<UserStrategy | null>(null);' src/views/StrategiesView.tsx

# Before return, add if (selectedDetailStrategy)
sed -i '90i \ \ if (selectedDetailStrategy) {\n    return <StrategyDetailView strategy={selectedDetailStrategy} onBack={() => setSelectedDetailStrategy(null)} />\n  }' src/views/StrategiesView.tsx

# Find h3 className="text-sm font-bold... and wrap it in a button to open details
# Let's replace the h3 with a clickable button
sed -i 's/<h3 className="text-sm font-bold text-text-primary dark:text-text-primary">{strat.name}<\/h3>/<button onClick={() => setSelectedDetailStrategy(strat)} className="text-sm font-bold text-text-primary hover:text-accent-primary transition-colors text-left">{strat.name}<\/button>/g' src/views/StrategiesView.tsx
