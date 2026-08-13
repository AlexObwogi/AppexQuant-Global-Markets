#!/bin/bash
find src/components src/views -name "*.tsx" -o -name "*.ts" | while read FILE; do
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
    
    # Let's also do a few typical zincs
    sed -i 's/bg-zinc-900/bg-bg-surface/g' $FILE
    sed -i 's/bg-zinc-950/bg-bg-main/g' $FILE
    sed -i 's/bg-zinc-800/bg-bg-hover/g' $FILE
    sed -i 's/bg-zinc-700/bg-bg-hover/g' $FILE
    sed -i 's/border-zinc-800/border-border-color/g' $FILE
    sed -i 's/border-zinc-700/border-border-color/g' $FILE
    sed -i 's/border-zinc-900/border-border-color/g' $FILE
    sed -i 's/text-zinc-300/text-text-primary/g' $FILE
    sed -i 's/text-zinc-400/text-text-secondary/g' $FILE
    sed -i 's/text-zinc-500/text-text-secondary/g' $FILE
    sed -i 's/text-zinc-950/text-bg-main/g' $FILE
done
