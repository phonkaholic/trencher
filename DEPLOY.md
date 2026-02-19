# TRENCHER — DEPLOYMENT GUIDE
# Run these commands on your local machine

# ── STEP 1: Clone & setup ─────────────────────────────────────
# Download the trencher folder from Claude outputs
# Then navigate into it:
cd trencher

# ── STEP 2: Initialize git & push to GitHub ───────────────────
git init
git remote add origin https://YOUR_GITHUB_TOKEN@github.com/phonkaholic/trencher.git
git checkout -b main

git add .
git commit -m "🚀 trencher v1.0 — initial launch"
git push -u origin main --force

# ── STEP 3: Enable GitHub Pages ───────────────────────────────
# Go to: https://github.com/phonkaholic/trencher/settings/pages
# Source: GitHub Actions
# Save — the workflow will auto-deploy the dashboard

# ── STEP 4: Set up Supabase schema ────────────────────────────
# Go to: https://wwlomifjbgblcvjhggdb.supabase.co/project/wwlomifjbgblcvjhggdb/sql/new
# Paste and run the contents of: supabase/schema.sql

# ── STEP 5: Add Telegram bot ──────────────────────────────────
# 1. Message @BotFather on Telegram
# 2. Send: /newbot
# 3. Name: trencher alerts
# 4. Username: trencheralertbot (or similar available name)
# 5. Copy the token
# 6. Create a channel, add your bot as admin
# 7. Get channel ID (forward a message to @userinfobot)
# 8. Fill in scanner/.env:
#    TELEGRAM_BOT_TOKEN=your_token
#    TELEGRAM_CHANNEL_ID=@yourchannel or -100xxxxxxxxxx

# ── STEP 6: Run the scanner locally ───────────────────────────
cd scanner
npm install
node src/index.js

# ── STEP 7: Deploy scanner to Railway (free) ──────────────────
# Go to: https://railway.app
# New project → Deploy from GitHub repo
# Set root directory: scanner
# Add all environment variables from scanner/.env
# Deploy!

# ── DONE ──────────────────────────────────────────────────────
# Dashboard: https://phonkaholic.github.io/trencher
# Scanner: Running on Railway
# Alerts: Telegram @trencheralertbot
