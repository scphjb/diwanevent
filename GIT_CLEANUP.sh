#!/bin/bash
# تنظيف venv وملفات ضخمة من تاريخ Git
# تحذير: هذا يعيد كتابة تاريخ Git — تأكد أن كل أعضاء الفريق على علم

echo "🧹 Removing venv from Git history..."
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch attendance_system/venv/' \
  --prune-empty --tag-name-filter cat -- --all

echo "🧹 Removing .env from Git history..."
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch attendance_system/.env' \
  --prune-empty --tag-name-filter cat -- --all

git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Done! Now force push: git push origin --force --all"
