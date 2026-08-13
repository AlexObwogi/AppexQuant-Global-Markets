#!/bin/bash
FILE="src/views/EducationView.tsx"

# Backgrounds
sed -i 's/bg-\[#111317\]/bg-bg-secondary/g' $FILE
sed -i 's/dark:bg-\[#181A20\]/dark:bg-bg-secondary/g' $FILE
sed -i 's/bg-\[#181A20\]/bg-bg-secondary/g' $FILE
sed -i 's/bg-\[#F5F5F5\]/bg-bg-secondary/g' $FILE
sed -i 's/bg-\[#FAFAFA\]/bg-bg-main/g' $FILE
sed -i 's/bg-white/bg-bg-surface/g' $FILE
sed -i 's/dark:bg-\[#1E2329\]/dark:bg-bg-surface/g' $FILE
sed -i 's/bg-\[#1E2329\]/bg-bg-surface/g' $FILE
sed -i 's/bg-\[#0C0E12\]/bg-bg-main/g' $FILE
sed -i 's/dark:bg-\[#0B0E14\]/dark:bg-bg-main/g' $FILE
sed -i 's/bg-\[#2B313A\]/bg-bg-hover/g' $FILE
sed -i 's/dark:bg-\[#2B313A\]/dark:bg-bg-hover/g' $FILE
sed -i 's/bg-\[#0ECB81\]/bg-color-success/g' $FILE
sed -i 's/bg-\[#F6465D\]/bg-color-danger/g' $FILE
sed -i 's/bg-\[#FCD535\]/bg-accent-primary/g' $FILE
sed -i 's/bg-\[#AEB4BC\]/bg-text-muted/g' $FILE

# Text
sed -i 's/dark:text-\[#848E9C\]/dark:text-text-secondary/g' $FILE
sed -i 's/text-\[#848E9C\]/text-text-secondary/g' $FILE
sed -i 's/text-\[#707A8A\]/text-text-secondary/g' $FILE
sed -i 's/dark:text-white/dark:text-text-primary/g' $FILE
sed -i 's/text-\[#1E2329\]/text-text-primary/g' $FILE
sed -i 's/text-\[#EAECEF\]/text-text-primary/g' $FILE
sed -i 's/text-\[#FCD535\]/text-accent-primary/g' $FILE
sed -i 's/text-\[#0ECB81\]/text-color-success/g' $FILE
sed -i 's/text-\[#03A66D\]/text-color-success/g' $FILE
sed -i 's/text-\[#F0B90B\]/text-color-warning/g' $FILE
sed -i 's/text-\[#F6465D\]/text-color-danger/g' $FILE
sed -i 's/text-\[#CF304A\]/text-color-danger/g' $FILE
sed -i 's/text-\[#C99400\]/text-accent-hover/g' $FILE
sed -i 's/text-\[#AEB4BC\]/text-text-muted/g' $FILE
sed -i 's/text-\[#5E6673\]/text-text-muted/g' $FILE
sed -i 's/text-\[#181A20\]/text-bg-secondary/g' $FILE

# Borders
sed -i 's/dark:border-\[#2B313A\]/dark:border-border-color/g' $FILE
sed -i 's/border-\[#2B313A\]/border-border-color/g' $FILE
sed -i 's/border-\[#EAECEF\]/border-border-color/g' $FILE
sed -i 's/border-\[#FCD535\]/border-accent-primary/g' $FILE
sed -i 's/border-\[#0ECB81\]/border-color-success/g' $FILE
sed -i 's/border-\[#F6465D\]/border-color-danger/g' $FILE
sed -i 's/border-\[#707A8A\]/border-text-secondary/g' $FILE

# Remove redundant dark: classes that map to the same variable
sed -i 's/dark:text-text-secondary //g' $FILE
sed -i 's/dark:text-text-primary //g' $FILE
sed -i 's/dark:bg-bg-secondary //g' $FILE
sed -i 's/dark:bg-bg-surface //g' $FILE
sed -i 's/dark:bg-bg-main //g' $FILE
sed -i 's/dark:border-border-color //g' $FILE
sed -i 's/dark:bg-bg-hover //g' $FILE

