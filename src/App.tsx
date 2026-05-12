import { useState, useEffect } from 'react'
import logoGreen  from './img/logo signed _ green.svg'
import logoBlack  from './img/logo signed _ blackbg.svg'
import { motion } from 'motion/react'
import {
  CaretRight, Moon, Sun, Lightning, ShieldCheck, Clock,
  Trophy, ArrowsDownUp, ArrowSquareOut, TrendUp, Eye, Crosshair,
} from '@phosphor-icons/react'
import { cn } from './lib/utils'

const BASE = (typeof window !== 'undefined' && (window as any).SCANNER_BASE) || 'http://localhost:3000'

type SignalBadgeType = 'STRONG' | 'MEDIUM' | 'LOW'

function SignalBadge({ type }: { type: SignalBadgeType }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
      type === 'STRONG' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      type === 'MEDIUM' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      type === 'LOW'    && 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
    )}>
      {type}
    </span>
  )
}

function fmtUSD(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden h-[600px] flex flex-col">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4"
          autoPlay loop muted playsInline
          className="w-full h-full object-cover scale-105 transition-transform duration-1000 opacity-30 dark:opacity-20"
        />
      </div>

      <motion.div
        className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live — scanning Solana 24/7
        </div>

        <h1 className="font-display text-[42px] md:text-[56px] font-medium tracking-tight leading-[1.1] text-[#0a1b33] dark:text-white mb-6 max-w-2xl">
          Stop guessing.<br />Start trading<br />with signals.
        </h1>

        <p className="font-sans text-[14px] md:text-[15px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed mb-8">
          Signd watches Solana meme coins 24/7 — scoring each one based on Smart Money wallets, KOL activity, and on-chain signals. Know when to get in. Know when to get out.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <motion.a
            href="/signd"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Open Dashboard
            <CaretRight size={14} />
          </motion.a>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Free to use. No email. No signup.</p>

        <div className="flex items-center gap-2 mt-5">
          <SignalBadge type="STRONG" />
          <SignalBadge type="MEDIUM" />
          <SignalBadge type="LOW" />
        </div>
      </motion.div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <motion.nav
          className="flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-200/40 dark:border-zinc-700/40 gap-1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
        >
          <div className="w-9 h-9 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 shadow-sm rounded-full flex items-center justify-center text-sm text-slate-700 dark:text-slate-300 flex-shrink-0">✦</div>
          {['How it works', 'Features', 'Proof', 'Roadmap'].map(label => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="px-4 py-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors rounded-full">
              {label}
            </a>
          ))}
          <a href="/signd"
            className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-5 py-2 rounded-full text-[12px] font-semibold text-[#0a1b33] dark:text-white border border-slate-200/60 dark:border-zinc-600/60 shadow-sm hover:border-slate-300 dark:hover:border-zinc-500 transition-all">
            Open Dashboard <CaretRight size={11} />
          </a>
        </motion.nav>
      </div>
    </section>
  )
}

// ── Performers Marquee ────────────────────────────────────────────────────────
interface WinEntry { address: string; symbol: string; name: string; gainMultiple: number; gainPct: number; }

function PerformersMarquee() {
  const [tokens, setTokens] = useState<WinEntry[]>([])

  useEffect(() => {
    fetch(BASE + '/api/wins')
      .then(r => r.json())
      .then(({ wins }: { wins: WinEntry[] }) => {
        if (!wins?.length) return
        setTokens([...wins].sort((a, b) => b.gainMultiple - a.gainMultiple).slice(0, 20))
      })
      .catch(() => {})
  }, [])

  if (!tokens.length) return null

  const track = [...tokens, ...tokens]

  return (
    <div className="relative mt-10 overflow-hidden border-y border-slate-200/60 dark:border-zinc-800/60 py-3"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <style>{`
        @keyframes perfMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .perf-track { animation: perfMarquee 40s linear infinite; }
        .perf-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="perf-track flex items-center gap-0 w-max">
        {track.map((t, i) => {
          const mult = t.gainMultiple >= 10 ? t.gainMultiple.toFixed(0) : t.gainMultiple.toFixed(1)
          return (
            <div key={i} className="flex items-center gap-3 px-6 flex-shrink-0">
              <div className="relative w-7 h-7 flex-shrink-0">
                <img
                  src={`https://dd.dexscreener.com/ds-data/tokens/solana/${t.address}.png`}
                  className="w-7 h-7 rounded-full object-cover"
                  onError={e => {
                    const el = e.target as HTMLImageElement
                    el.style.display = 'none'
                    el.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 absolute inset-0 items-center justify-center text-[10px] font-bold text-slate-500 uppercase flex">
                  {t.symbol.slice(0, 2)}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-[#0a1b33] dark:text-white">${t.symbol}</span>
                <span className="text-xs font-bold text-emerald-500">+{mult}x</span>
              </div>
              <span className="text-slate-200 dark:text-zinc-700 select-none ml-2">·</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Proof Section ─────────────────────────────────────────────────────────────
interface WinRecord {
  address: string; symbol: string; name: string;
  entryMC: number; peakMC: number;
  gainPct: number; gainMultiple: number;
  signal: string; type: string;
}

function ProofSection() {
  const [wins, setWins] = useState<WinRecord[]>([])

  useEffect(() => {
    fetch(BASE + '/api/wins')
      .then(r => r.json())
      .then(({ wins }: { wins: WinRecord[] }) => {
        if (!wins?.length) return
        setWins([...wins].sort((a, b) => b.gainMultiple - a.gainMultiple).slice(0, 6))
      })
      .catch(() => {})
  }, [])

  if (!wins.length) return null

  return (
    <section id="proof" className="py-24">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          <TrendUp size={11} /> Real calls. Real results.
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">
          Tokens our scanner called early
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
          These are actual wins recorded by the scanner — entry price at detection, peak price reached while on watchlist.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
        {wins.map((w, i) => {
          const mult     = w.gainMultiple ?? 1
          const multDisp = mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)
          const pct      = w.gainPct != null ? `+${w.gainPct.toFixed(0)}%` : ''
          const sigCls   = w.signal === 'STRONG'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : w.signal === 'MEDIUM'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'

          return (
            <motion.a
              key={w.address}
              href={`/token?address=${encodeURIComponent(w.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col gap-4',
                i === 0 && 'ring-2 ring-amber-400/40'
              )}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <img
                    src={`https://dd.dexscreener.com/ds-data/tokens/solana/${w.address}.png`}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#0a1b33] dark:text-white text-sm">${w.symbol}</div>
                  <div className="text-xs text-slate-400 truncate">{w.name}</div>
                </div>
                <span className={cn('ml-auto text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0', sigCls)}>
                  {w.signal}
                </span>
              </div>

              <div className="text-center py-2">
                <div className="text-3xl font-extrabold text-emerald-500 leading-none">{multDisp}x</div>
                <div className="text-sm text-emerald-400 mt-0.5">{pct}</div>
              </div>

              <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-zinc-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Entry MC</span>
                  <span className="font-semibold text-[#0a1b33] dark:text-slate-300">{fmtUSD(w.entryMC)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Peak MC</span>
                  <span className="font-semibold text-emerald-600">{fmtUSD(w.peakMC)}</span>
                </div>
              </div>
            </motion.a>
          )
        })}
      </div>

      <div className="text-center mt-8">
        <a href="/signd" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors">
          See all signals in the dashboard <CaretRight size={13} />
        </a>
      </div>
    </section>
  )
}

// ── Why Signd ─────────────────────────────────────────────────────────────
const whyItems = [
  {
    icon: Eye,
    title: 'Smart Money & KOL tracking',
    desc: "We watch wallets that actually make money — not retail noise. When a known profitable wallet or KOL buys a token, you see it immediately.",
  },
  {
    icon: Crosshair,
    title: 'Analyzed by a trained model.',
    desc: 'Every token is scored by an AI trained on thousands of on-chain signals — Smart Money count, KOL activity, rug ratio, graduation speed. You see the result, not the noise.',
  },
  {
    icon: TrendUp,
    title: 'Win rate you can verify',
    desc: "Every call is recorded with entry price and peak. You can see the scanner's track record in real time — wins, misses, and the actual numbers.",
  },
]

function WhySection() {
  return (
    <section className="py-24">
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-16 items-start">

        {/* Left — sticky heading */}
        <div className="lg:sticky lg:top-28">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-4 tracking-tight leading-tight">
            Three reasons you'll keep coming back
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Most scanners are noise machines. Signd filters 99% of tokens before you ever see them.
          </p>
        </div>

        {/* Right — items */}
        <div className="space-y-4">
          {whyItems.map((item, i) => (
            <motion.div
              key={item.title}
              className="flex items-start gap-5 rounded-3xl p-7 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <span className="text-3xl font-bold text-slate-100 dark:text-zinc-800 select-none leading-none pt-1 w-10 flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 flex-shrink-0">
                    <item.icon size={15} className="text-slate-600 dark:text-slate-300" weight="duotone" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#0a1b33] dark:text-white">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { icon: '🔍', step: 'Step 1', title: 'Scanner detects tokens',   desc: 'Every 60 seconds, Signd scans new Solana tokens — filtering by Smart Money wallets, KOL activity, rug ratio, bundler rate, and graduation speed.' },
  { icon: '📊', step: 'Step 2', title: 'Signals are scored',       desc: 'Each token gets a STRONG, MEDIUM, or LOW signal based on a transparent scoring model. You see the exact reasons behind every call.' },
  { icon: '⚡', step: 'Step 3', title: 'You trade with an edge',   desc: 'Open the dashboard, see what the scanner is watching, and execute directly on Pump.fun or GMGN — before the crowd.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">How Signd works</h2>
      </motion.div>
      <div className="grid sm:grid-cols-3 gap-5">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            className="group rounded-3xl p-8 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">{s.icon}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{s.step}</div>
            <h3 className="font-display text-lg font-semibold text-[#0a1b33] dark:text-white mb-3">{s.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
const features = [
  { icon: Lightning,      title: 'Smart Money Signals',   desc: 'Tokens are scored by how many known profitable wallets and KOL influencers are already in. Higher conviction = STRONG signal.' },
  { icon: ShieldCheck,   title: 'Rug & Bundler Filter',  desc: 'Hard filters remove tokens with high rug ratio, wash trading, top-10 holder concentration, or aggressive bundler dumping before you see them.' },
  { icon: Clock,         title: 'Peak MC Tracking',      desc: 'The scanner records the highest market cap each token has reached since being called — so you can see the real upside after detection.' },
  { icon: Trophy,        title: 'Top 5 All-Time Calls',  desc: 'The 5 highest-gain tokens ever called by the scanner are shown at the top — with entry MC, peak MC, and gain multiple.' },
  { icon: ArrowsDownUp,  title: 'Live Watchlist',        desc: 'See every token currently being monitored in real time — sorted by signal strength, with current gain % and peak MC visible.' },
  { icon: ArrowSquareOut, title: 'One-Click Trading',    desc: 'Every token has direct links to Pump.fun, GMGN, and DexScreener. No copy-paste, no hunting.' },
]

function Features() {
  return (
    <section id="features" className="py-24">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">
          Everything you need to trade smarter
        </h2>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="group rounded-3xl p-7 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
              <f.icon size={18} className="text-[#0a1b33] dark:text-white" weight="duotone" />
            </div>
            <h3 className="font-display text-base font-semibold text-[#0a1b33] dark:text-white mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
const phases = [
  {
    num: '1', title: 'Premium Plan', status: 'Coming soon',
    statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/40',
    active: true,
    tagline: 'For traders who need speed.',
    items: ['Signal refresh every 15s instead of 60s', 'Priority access to new coin additions', 'Signal history (last 24 hours)', 'Early access to future features'],
  },
  {
    num: '2', title: 'AI Scoring Layer', status: 'In development',
    statusColor: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/50 border-slate-200/50 dark:border-zinc-700/40',
    active: false,
    tagline: 'Train a model on our own win/miss data.',
    items: ['ML model trained on historical wins and misses', 'Probability score per token (not just tier)', 'Learns which signal combinations actually predict 2x+', 'Improves continuously as more data accumulates'],
  },
  {
    num: '3', title: 'Personalized Edge', status: 'Future',
    statusColor: 'text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-900/50 border-slate-100/50 dark:border-zinc-800/30',
    active: false,
    tagline: 'Signals built around your wallet history.',
    items: ["Connect your wallet's trade history", 'AI learns your risk tolerance and preferred hold time', 'Recommendations tailored to your trading style', 'Personal P&L dashboard'],
  },
]

function Roadmap() {
  return (
    <section id="roadmap" className="py-24">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">What's coming next</h2>
      </motion.div>
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-slate-300/60 via-slate-200 dark:via-zinc-700 to-transparent hidden sm:block" />
        <div className="space-y-5">
          {phases.map((p, pi) => (
            <motion.div
              key={p.num}
              className="sm:pl-16 relative"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: pi * 0.15 }}
            >
              <div className={cn(
                'absolute left-0 top-7 w-12 h-12 rounded-full border-2 items-center justify-center text-sm font-bold hidden sm:flex',
                p.active ? 'border-slate-400 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300' : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-400 dark:text-zinc-500',
              )}>{p.num}</div>
              <div className={cn(
                'rounded-3xl p-7 bg-white dark:bg-zinc-900 border transition-all',
                p.active ? 'border-slate-300/80 dark:border-zinc-700 shadow-sm' : 'border-slate-200/60 dark:border-zinc-800',
              )}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className={cn('font-display text-lg font-semibold', p.active ? 'text-[#0a1b33] dark:text-white' : 'text-slate-600 dark:text-zinc-400')}>{p.title}</h3>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', p.statusColor)}>{p.status}</span>
                </div>
                <p className={cn('text-sm mb-4', p.active ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-zinc-500')}>{p.tagline}</p>
                <ul className="space-y-2">
                  {p.items.map(item => (
                    <li key={item} className={cn('flex items-start gap-2 text-sm', p.active ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-zinc-500')}>
                      <span className={cn('mt-0.5 flex-shrink-0 font-bold', p.active ? 'text-emerald-500' : 'text-slate-300 dark:text-zinc-600')}>→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="py-24">
      <motion.div
        className="relative text-center rounded-[48px] px-8 py-20 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm"
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(29,158,117,0.07), transparent)' }} />
        <div className="relative z-10">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#0a1b33] dark:text-white mb-4 tracking-tight">
            Ready to trade with an edge?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base mb-3 max-w-md mx-auto">
            Free to use. No email. No signup. Just open the dashboard and see what the scanner is watching right now.
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mb-10">⚠️ Not financial advice — DYOR.</p>
          <motion.a
            href="/signd"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Open Dashboard
            <CaretRight size={16} />
          </motion.a>
        </div>
      </motion.div>
    </section>
  )
}

// ── Top Nav ───────────────────────────────────────────────────────────────────
function TopNav({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-zinc-800/60 backdrop-blur-sm bg-[#f9fafb]/80 dark:bg-zinc-950/80">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img src={logoGreen} alt="Signd" className="h-7 w-auto dark:hidden" />
          <img src={logoBlack} alt="Signd" className="h-7 w-auto hidden dark:block" />
        </a>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors shadow-sm"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}

          </button>
          <a href="/signd"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white text-sm font-semibold transition-opacity hover:opacity-90 shadow-sm">
            Open Dashboard
          </a>
        </div>
      </div>
    </nav>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-zinc-800/60 mt-0">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <img src={logoGreen} alt="Signd" className="h-6 w-auto dark:hidden" />
            <img src={logoBlack} alt="Signd" className="h-6 w-auto hidden dark:block" />
            <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">— Smart Money signals for Solana</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-right max-w-sm leading-relaxed">
            <em>Algorithmic signals for informational purposes only. Not financial advice. Always do your own research.</em>
          </p>
        </div>
        <div className="border-t border-slate-200/40 dark:border-zinc-800/40 pt-5 text-xs text-center text-slate-400 dark:text-zinc-600">
          © 2025 Signd
        </div>
      </div>
    </footer>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false)

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-[#f9fafb] dark:bg-zinc-950 transition-colors duration-300">
        <TopNav dark={dark} toggleDark={() => setDark(d => !d)} />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="pt-8">
            <Hero />
            <PerformersMarquee />
            <HowItWorks />
            <WhySection />
            <Features />
            <ProofSection />
            <Roadmap />
            <CTABanner />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
