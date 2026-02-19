const { createClient } = require('@supabase/supabase-js');
const { log } = require('./utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function saveToken(tokenData, scoreResult) {
  try {
    const record = {
      address: tokenData.address,
      name: tokenData.name || 'Unknown',
      symbol: tokenData.symbol || '???',
      score: scoreResult.score,
      grade: scoreResult.grade,
      flags: scoreResult.flags,
      price_usd: tokenData.priceUsd || 0,
      price_change_5m: tokenData.priceChange5m || 0,
      price_change_1h: tokenData.priceChange1h || 0,
      liquidity_usd: tokenData.liquidityUsd || 0,
      fdv: tokenData.fdv || 0,
      market_cap: tokenData.marketCap || 0,
      volume_5m: tokenData.volume5m || 0,
      volume_1h: tokenData.volume1h || 0,
      buys_5m: tokenData.buys5m || 0,
      sells_5m: tokenData.sells5m || 0,
      buy_ratio_5m: tokenData.buyRatio5m || 0.5,
      holder_count: tokenData.holderData?.holderCount || 0,
      top10_pct: tokenData.holderData?.top10Pct || 0,
      smart_money_count: tokenData.holderData?.smartMoneyCount || 0,
      pair_address: tokenData.pairAddress,
      image_url: tokenData.imageUrl,
      has_twitter: tokenData.socials?.some(s => s.type === 'twitter') || false,
      has_telegram: tokenData.socials?.some(s => s.type === 'telegram') || false,
      has_website: (tokenData.websites?.length || 0) > 0,
      source: tokenData.source || 'pump.fun',
      dex_url: tokenData.url,
      pair_created_at: tokenData.pairCreatedAt ? new Date(tokenData.pairCreatedAt).toISOString() : null,
      detected_at: tokenData.timestamp ? new Date(tokenData.timestamp).toISOString() : new Date().toISOString(),
      scored_at: tokenData.scoredAt || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('tokens')
      .upsert(record, { onConflict: 'address' });

    if (error) {
      log('error', `Supabase save error: ${error.message}`);
    } else {
      log('info', `💾 Saved ${tokenData.symbol} to database`);
    }
  } catch (err) {
    log('error', `saveToken error: ${err.message}`);
  }
}

async function saveAlert(tokenData, scoreResult) {
  try {
    const { error } = await supabase
      .from('alerts')
      .insert({
        token_address: tokenData.address,
        token_symbol: tokenData.symbol,
        grade: scoreResult.grade,
        score: scoreResult.score,
        flags: scoreResult.flags,
        price_at_alert: tokenData.priceUsd,
        fdv_at_alert: tokenData.fdv,
        alerted_at: new Date().toISOString()
      });

    if (error) {
      log('error', `Supabase alert save error: ${error.message}`);
    }
  } catch (err) {
    log('error', `saveAlert error: ${err.message}`);
  }
}

async function getRecentTokens(limit = 100, minGrade = null) {
  let query = supabase
    .from('tokens')
    .select('*')
    .order('scored_at', { ascending: false })
    .limit(limit);

  if (minGrade) {
    const gradeOrder = ['S', 'A', 'B', 'C'];
    const minIndex = gradeOrder.indexOf(minGrade);
    const validGrades = gradeOrder.slice(0, minIndex + 1);
    query = query.in('grade', validGrades);
  }

  const { data, error } = await query;
  if (error) {
    log('error', `getRecentTokens error: ${error.message}`);
    return [];
  }
  return data;
}

module.exports = { saveToken, saveAlert, getRecentTokens, supabase };
