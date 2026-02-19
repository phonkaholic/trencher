const { log } = require('./utils/logger');

// ============================================================
// TRENCHER SCORING ENGINE v1.0
// Score range: 0–100
// Grades: S (80+), A (60–79), B (40–59), C (<40)
// ============================================================

const GRADE_THRESHOLDS = { S: 80, A: 60, B: 40 };

function scoreToken(tokenData, holderData) {
  const flags = [];
  let score = 0;

  // ── INSTANT DISQUALIFIERS ──────────────────────────────────
  if (holderData?.top1Pct > 20) {
    return buildResult(0, ['DEV_DUMP_RISK'], tokenData);
  }
  if (tokenData.liquidityUsd < 3000) {
    return buildResult(0, ['LOW_LIQUIDITY'], tokenData);
  }
  if (holderData?.top10Pct > 65) {
    return buildResult(0, ['WHALE_CONCENTRATION'], tokenData);
  }
  if (isBundleDetected(tokenData)) {
    return buildResult(0, ['BUNDLE_DETECTED'], tokenData);
  }

  // ── MOMENTUM SIGNALS (0–40 pts) ───────────────────────────
  // Buy pressure
  if (tokenData.buyRatio5m >= 0.75) {
    score += 18;
    flags.push('STRONG_BUY_PRESSURE');
  } else if (tokenData.buyRatio5m >= 0.6) {
    score += 10;
    flags.push('MODERATE_BUY_PRESSURE');
  }

  // Price velocity
  if (tokenData.priceChange5m >= 50) {
    score += 12;
    flags.push('5M_EXPLOSION');
  } else if (tokenData.priceChange5m >= 20) {
    score += 8;
    flags.push('5M_SURGE');
  } else if (tokenData.priceChange5m >= 10) {
    score += 4;
    flags.push('5M_PUMP');
  }

  // Unique buyer activity (total txns as proxy)
  const totalTxns5m = (tokenData.buys5m || 0) + (tokenData.sells5m || 0);
  if (tokenData.buys5m >= 50) {
    score += 10;
    flags.push('HIGH_ORGANIC_BUYS');
  } else if (tokenData.buys5m >= 20) {
    score += 5;
    flags.push('ORGANIC_BUYS');
  }

  // ── SMART MONEY SIGNALS (0–30 pts) ───────────────────────
  if (holderData?.smartMoneyCount >= 3) {
    score += 30;
    flags.push(`SMART_MONEY_x${holderData.smartMoneyCount}`);
  } else if (holderData?.smartMoneyCount === 2) {
    score += 20;
    flags.push('SMART_MONEY_x2');
  } else if (holderData?.smartMoneyCount === 1) {
    score += 10;
    flags.push('SMART_MONEY_x1');
  }

  // ── SAFETY SIGNALS (0–15 pts) ─────────────────────────────
  if (tokenData.liquidityUsd >= 50000) {
    score += 8;
    flags.push('STRONG_LIQUIDITY');
  } else if (tokenData.liquidityUsd >= 15000) {
    score += 4;
    flags.push('DECENT_LIQUIDITY');
  }

  if (holderData?.holderCount >= 100) {
    score += 4;
    flags.push('DISTRIBUTED_HOLDERS');
  } else if (holderData?.holderCount >= 30) {
    score += 2;
    flags.push('GROWING_HOLDERS');
  }

  // Age check — very new tokens get a mild bonus (early entry)
  const ageMs = Date.now() - (tokenData.pairCreatedAt || Date.now());
  const ageMin = ageMs / 60000;
  if (ageMin <= 5) {
    score += 3;
    flags.push('ULTRA_EARLY');
  } else if (ageMin <= 15) {
    score += 1;
    flags.push('EARLY');
  }

  // ── SOCIAL SIGNALS (0–15 pts) ─────────────────────────────
  if (tokenData.socials?.some(s => s.type === 'twitter')) {
    score += 5;
    flags.push('HAS_TWITTER');
  }
  if (tokenData.websites?.length > 0) {
    score += 5;
    flags.push('HAS_WEBSITE');
  }
  if (tokenData.socials?.some(s => s.type === 'telegram')) {
    score += 5;
    flags.push('HAS_TELEGRAM');
  }

  // Cap at 100
  score = Math.min(score, 100);

  return buildResult(score, flags, tokenData);
}

function buildResult(score, flags, tokenData) {
  const grade = getGrade(score);
  return {
    score,
    grade,
    flags,
    shouldAlert: grade === 'S' || grade === 'A',
    summary: buildSummary(score, grade, flags, tokenData)
  };
}

function getGrade(score) {
  if (score >= GRADE_THRESHOLDS.S) return 'S';
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  return 'C';
}

function isBundleDetected(tokenData) {
  // Heuristic: if sells in first 5m are 0 but buys are very high,
  // could be a bundle bot artificially inflating
  if (tokenData.sells5m === 0 && tokenData.buys5m > 100) return true;

  // If volume is absurdly high vs liquidity ratio
  if (tokenData.volume5m > tokenData.liquidityUsd * 10) return true;

  return false;
}

function buildSummary(score, grade, flags, tokenData) {
  const topFlags = flags.slice(0, 3).join(', ');
  return `Grade ${grade} (${score}/100) — ${topFlags}`;
}

module.exports = { scoreToken, getGrade, GRADE_THRESHOLDS };
