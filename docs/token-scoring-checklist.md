# Token Scoring Checklist
> Derived from analysis of 7 pump.fun tokens that ran well (Apr 2026)
> Use after `gmgn-cli token info` + `token security`

---

## HARD STOPS (jika ada satu saja → skip token ini)

- [ ] `is_honeypot` = yes → **SKIP**
- [ ] `renounced_mint` = false → **SKIP**
- [ ] `renounced_freeze_account` = false → **SKIP**
- [ ] `buy_tax` atau `sell_tax` > 5% → **SKIP**
- [ ] `launchpad_progress` < 1 (belum graduated) → belum saatnya masuk
- [ ] `burn_status` ≠ "burn" → **SKIP**

---

## SCORING (0–100 poin)

### A. Smart Money Signal (40 poin — paling penting)

| Kondisi | Poin |
|---------|------|
| Smart wallets ≥ 30 | 40 |
| Smart wallets 20–29 | 32 |
| Smart wallets 15–19 | 24 |
| Smart wallets 8–14 | 12 |
| Smart wallets < 8 | 0 |

**Field:** `wallet_tags_stat.smart_wallets`

---

### B. KOL Presence (15 poin)

| Kondisi | Poin |
|---------|------|
| KOL wallets ≥ 8 | 15 |
| KOL wallets 4–7 | 10 |
| KOL wallets 1–3 | 5 |
| KOL wallets = 0 | 0 |

**Field:** `wallet_tags_stat.renowned_wallets`

---

### C. Dev & Community Health (20 poin)

| Kondisi | Poin |
|---------|------|
| `cto_flag` = 1 (community takeover) | +10 |
| `creator_token_status` = creator_close (dev sudah sell) | +10 |
| `creator_token_status` = creator_hold | +0 (tidak dapat poin ini) |

> Catatan: creator hold bukan langsung disqualify, tapi mengurangi confidence. Cek `creator_open_count` — jika serial launcher (>50 token), bisa lebih ditoleransi.

---

### D. Distribution Quality (15 poin)

| Kondisi | Poin |
|---------|------|
| Top10 holder rate < 18% | 15 |
| Top10 holder rate 18–22% | 10 |
| Top10 holder rate 22–26% | 5 |
| Top10 holder rate > 26% | 0 |

**Field:** `stat.top_10_holder_rate`

---

### E. Sniper Risk (10 poin)

| Kondisi | Poin |
|---------|------|
| Sniper wallets < 10 | 10 |
| Sniper wallets 10–20 | 6 |
| Sniper wallets 21–35 | 3 |
| Sniper wallets > 35 | 0 |

**Field:** `wallet_tags_stat.sniper_wallets`

---

## VERDICT

| Total Skor | Status |
|------------|--------|
| 80–100 | 🟢 **Strong** — worth position sizing besar |
| 60–79 | 🟡 **Decent** — entry kecil, monitor dulu |
| 40–59 | 🟠 **Weak** — skip kecuali ada catalyst eksternal |
| < 40 | 🔴 **Pass** — jangan masuk |

---

## BONUS SIGNALS (tidak masuk skor, tapi timbang manual)

- `dev.dexscr_ad` = 1 → dev bayar iklan DEX, ada upaya marketing
- `dev.dexscr_boost_fee` > 0 → ada spend untuk visibility
- `link.telegram` ada → ada community
- `link.website` ada → ada upaya ekosistem
- `stat.fresh_wallet_rate` > 15% → banyak wallet baru, mungkin coordinated
- `stat.top_bundler_trader_percentage` > 30% → dominasi bot, hati-hati
- `dev.creator_open_count` > 50 → serial launcher, bisa bullish (experienced) atau bearish (farm token)
- `dev.ath_token_info.ath_mc` → cek apakah dev pernah buat token besar sebelumnya

---

## CARA PAKAI CEPAT

```bash
# 1. Ambil info
gmgn-cli token info --chain sol --address <ADDR> --raw

# 2. Check security
gmgn-cli token security --chain sol --address <ADDR> --raw

# 3. Isi checklist ini, hitung skor
# 4. Jika skor ≥ 60, cek smart money detail:
gmgn-cli token holders --chain sol --address <ADDR> --tag smart_degen --order-by amount_percentage --limit 20
```

---

## REFERENSI BENCHMARK (Apr 2026)

| Token | SM | KOL | CTO | Top10 | Snipers | Skor | Run |
|-------|----|----|-----|-------|---------|------|-----|
| MLG | 38 | 11 | ✅ | 20% | 36 | **88** | 10x |
| CAR | 24 | 3 | ✅ | 21% | 8 | **76** | 3x |
| GME | 16 | 1 | ✅ | 20% | 33 | **57** | 4.5x* |
| elon.exe | 12 | 6 | ✅ | 22% | 24 | **52** | 2.4x |
| SAEP | 6 | 0 | ❌ | 20% | 87 | **22** | 2.4x** |
| phone | 3 | 3 | ✅ | 18% | 30 | **28** | 2x |
| Plumpshies | 20 | 5 | ✅ | 26% | 17 | **68** | 1.3x*** |

*GME run tinggi karena creator adalah serial launcher berpengalaman dengan heavy marketing spend ($899 boost)
**SAEP run meski skor rendah — kemungkinan ada catalyst eksternal (project legit dengan website + telegram)
***Plumpshies skor bagus tapi run lemah — liquidity rendah ($12K) jadi price impact besar, susah tembus

> Pelajaran: skor tinggi ≠ garansi run. Tapi skor rendah = skip lebih aman.
