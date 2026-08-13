#!/bin/bash
FILES=(
  "src/views/BacktestView.tsx"
  "src/views/AnalyticsView.tsx"
  "src/views/AccountView.tsx"
  "src/views/DashboardView.tsx"
  "src/views/MarketsView.tsx"
  "src/views/TradeView.tsx"
  "src/views/EAsView.tsx"
  "src/views/P2PView.tsx"
  "src/views/NewsView.tsx"
  "src/views/CommunityView.tsx"
  "src/views/SystemHealthView.tsx"
  "src/views/AutomationControlCenterView.tsx"
  "src/views/AdminBoundaryView.tsx"
  "src/views/SignalsView.tsx"
  "src/views/StrategiesView.tsx"
  "src/views/CalendarView.tsx"
  "src/views/LegalView.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    sed -i 's/bg-slate-900/bg-bg-surface/g' $FILE
    sed -i 's/bg-slate-950/bg-bg-main/g' $FILE
    sed -i 's/bg-slate-800/bg-bg-hover/g' $FILE
    sed -i 's/bg-slate-700/bg-bg-hover/g' $FILE
    sed -i 's/border-slate-800/border-border-color/g' $FILE
    sed -i 's/border-slate-700/border-border-color/g' $FILE
    sed -i 's/border-slate-900/border-border-color/g' $FILE
    sed -i 's/text-slate-300/text-text-primary/g' $FILE
    sed -i 's/text-slate-400/text-text-secondary/g' $FILE
    sed -i 's/text-slate-500/text-text-secondary/g' $FILE
    sed -i 's/text-slate-950/text-bg-main/g' $FILE
    
    # Specific UI tweaks (e.g. text-white in backtest could be text-text-primary)
    sed -i 's/text-white/text-text-primary/g' $FILE
  fi
done
