import { useState, useEffect } from 'react'
import logoGreen  from './img/logo signed _ green.svg'
import logoBlack  from './img/logo signed _ blackbg.svg'
import { motion } from 'motion/react'
import {
  CaretRight, Moon, Sun, Lightning, ShieldCheck, Clock,
  Trophy, ArrowsDownUp, ArrowSquareOut, TrendUp, Eye, Crosshair,
  XLogo,
} from '@phosphor-icons/react'
import { cn } from './lib/utils'

const BASE = (() => {
  if (typeof window === 'undefined') return ''
  const configured = (window as any).SCANNER_BASE
  if (configured) return configured
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return 'http://localhost:3000'
  return window.location.origin
})()

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
            href="/memesight"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Open Dashboard
            <CaretRight size={14} />
          </motion.a>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Free to use. No email. No signup.</p>
        <a
          href="https://x.com/Signdsol"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0a1b33] dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <XLogo size={13} weight="bold" /> @Signdsol
        </a>

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
          <a href="/memesight"
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
interface SignalEntry { address: string; symbol?: string; name?: string; signal?: string; feeSol?: number; }
interface MarqueeToken { address: string; symbol: string; label: string; tone: 'gain' | 'signal'; }

function PerformersMarquee() {
  const [tokens, setTokens] = useState<MarqueeToken[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadTokens() {
      try {
        const { wins } = await fetch(BASE + '/api/wins', { cache: 'no-store' }).then(r => r.json()) as { wins?: WinEntry[] }
        if (wins?.length) {
          const mapped = [...wins]
            .sort((a, b) => b.gainMultiple - a.gainMultiple)
            .slice(0, 20)
            .map(t => {
              const mult = t.gainMultiple >= 10 ? t.gainMultiple.toFixed(0) : t.gainMultiple.toFixed(1)
              return { address: t.address, symbol: t.symbol, label: `+${mult}x`, tone: 'gain' as const }
            })
          if (!cancelled) setTokens(mapped)
          return
        }
      } catch {}

      try {
        const { signals } = await fetch(BASE + '/api/signals', { cache: 'no-store' }).then(r => r.json()) as { signals?: SignalEntry[] }
        const mapped = (signals || [])
          .filter(t => t.address && (t.symbol || t.name))
          .slice(0, 20)
          .map(t => ({
            address: t.address,
            symbol: t.symbol || t.name || t.address.slice(0, 4),
            label: t.signal || (t.feeSol ? `${Number(t.feeSol).toFixed(1)} SOL` : 'LIVE'),
            tone: 'signal' as const,
          }))
        if (!cancelled && mapped.length) setTokens(mapped)
      } catch {}
    }

    loadTokens()
    return () => { cancelled = true }
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
                <span className={cn('text-xs font-bold', t.tone === 'gain' ? 'text-emerald-500' : 'text-amber-500')}>{t.label}</span>
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
        <a href="/memesight" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors">
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
            href="/memesight"
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
          <a href="/memesight"
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
        <div className="border-t border-slate-200/40 dark:border-zinc-800/40 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-zinc-600">
          <span>© 2026 Signd</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="/docs" className="hover:text-[#0a1b33] dark:hover:text-white transition-colors">Docs</a>
            <a href="/brand-kit" className="hover:text-[#0a1b33] dark:hover:text-white transition-colors">Brand Kit</a>
            <a
              href="https://x.com/Signdsol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#0a1b33] dark:hover:text-white transition-colors"
            >
              <XLogo size={13} weight="bold" /> @Signdsol
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
const docsNav = ['Read the table', 'Market cap logic', 'Persistence', 'Links']
const docsSections = [
  {
    id: 'read-the-table',
    kicker: '01',
    title: 'Read the table',
    body: 'The dashboard is a live scanner surface. Start from signal tier, then confirm token age, global fee, smart money/KOL reasons, and market cap movement before opening a trade link.',
    rows: [
      ['Signal', 'STRONG, MEDIUM, or LOW based on the scanner score and supporting reasons.'],
      ['Token Age', 'Age from token creation, useful for separating fresh calls from older migrated tokens.'],
      ['Called', 'When Signd added the token to the active watch session.'],
      ['Signal + Est. Profit', 'The conviction tier plus rough expectation band. This is not a guarantee.'],
    ],
  },
  {
    id: 'market-cap-logic',
    kicker: '02',
    title: 'Market cap logic',
    body: 'Market cap fields are intentionally separated so deploys, slow kline responses, and GMGN snapshots do not blur entry, current, and peak values.',
    rows: [
      ['Start MC', 'Locked at the moment the token enters the watchlist. It should not move after entry.'],
      ['MC Now', 'Latest market cap from kline-derived price movement or the newest GMGN snapshot. The percentage underneath compares against Start MC.'],
      ['Peak MC', 'Highest observed market cap while watched. Uses kline highs when available, otherwise the highest GMGN snapshot seen by the scanner.'],
      ['Blank Peak', 'No higher market cap has been observed yet. The app does not copy Start MC into Peak MC.'],
    ],
  },
  {
    id: 'persistence',
    kicker: '03',
    title: 'Persistence',
    body: 'Supabase stores both history and active scanner state. On deploy, Signd restores active watch entries before the first scan so calls do not restart from an empty memory session.',
    rows: [
      ['active_watch', 'Live watch session restore data for new creation, completed, and near-completion scanners.'],
      ['signals', 'Latest scanner records shown by the dashboard and landing fallback marquee.'],
      ['wins / misses', 'Settled historical performance used for proof, win rate, and export data.'],
      ['calls', 'Call List records and verdict tracking.'],
    ],
  },
  {
    id: 'links',
    kicker: '04',
    title: 'Trading links',
    body: 'Axiom is the primary action link. GMGN remains available with Signd referral formatting. Pump.fun stays available for token launch pages.',
    rows: [
      ['Axiom', 'https://axiom.trade/t/<contract>/@signd?chain=sol'],
      ['GMGN', 'https://gmgn.ai/sol/token/signd_<contract>'],
      ['Pump.fun', 'https://pump.fun/<contract>'],
      ['Official X', 'https://x.com/Signdsol'],
    ],
  },
]

const brandColors = [
  { name: 'Signal Green', hex: '#009B72', use: 'Logo, primary accents, live states' },
  { name: 'Ink Navy', hex: '#0A1B33', use: 'Primary text, dark buttons' },
  { name: 'Canvas', hex: '#F9FAFB', use: 'Page background' },
  { name: 'Mist Border', hex: '#E2E8F0', use: 'Dividers, table borders' },
  { name: 'Medium Amber', hex: '#F59E0B', use: 'Medium confidence signals' },
  { name: 'Risk Red', hex: '#EF4444', use: 'Negative deltas and risk states' },
]

function PageHeader({ label, title, copy }: { label: string; title: string; copy: string }) {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          {label}
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-[#0a1b33] dark:text-white mb-5">{title}</h1>
        <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">{copy}</p>
      </div>
    </section>
  )
}

function DocsPage() {
  return (
    <main className="max-w-[1180px] mx-auto px-4 sm:px-6 pb-20">
      <PageHeader
        label="Docs"
        title="Operate the scanner without guessing"
        copy="A product reference for reading Signd's live table, understanding market cap tracking, and knowing which data survives deploys."
      />
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 border-l border-slate-200 dark:border-zinc-800 pl-4 text-sm">
            {docsNav.map((item, i) => (
              <a key={item} href={`#${docsSections[i].id}`} className="block py-2 text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </aside>
        <div className="space-y-5">
          {docsSections.map(section => (
            <section id={section.id} key={section.title} className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 p-6 md:p-8 shadow-sm scroll-mt-24">
              <div className="flex items-start gap-4 mb-6">
                <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 pt-1">{section.kicker}</span>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#0a1b33] dark:text-white mb-2">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">{section.body}</p>
                </div>
              </div>
              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800 border-y border-slate-200/70 dark:border-zinc-800">
                {section.rows.map(([term, desc]) => (
                  <div key={term} className="grid md:grid-cols-[180px_1fr] gap-2 py-4 text-sm">
                    <div className="font-semibold text-[#0a1b33] dark:text-white">{term}</div>
                    <div className="text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}

function BrandKitPage() {
  return (
    <main className="max-w-[1180px] mx-auto px-4 sm:px-6 pb-20">
      <PageHeader
        label="Brand Kit"
        title="A restrained signal brand"
        copy="Signd should feel precise, fast, and calm. The brand system favors quiet confidence over trading hype."
      />
      <section className="rounded-lg overflow-hidden border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm mb-6">
        <div className="grid lg:grid-cols-[1.2fr_.8fr]">
          <div className="min-h-[280px] bg-[#f9fafb] dark:bg-zinc-950 flex items-center justify-center p-10 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-zinc-800">
            <img src={logoGreen} alt="Signd logo" className="h-14 w-auto dark:hidden" />
            <img src={logoBlack} alt="Signd logo" className="h-14 w-auto hidden dark:block" />
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-between gap-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Primary Lockup</div>
              <h2 className="font-display text-2xl font-semibold text-[#0a1b33] dark:text-white mb-3">Use the full Signd wordmark wherever space allows.</h2>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Keep the logo on quiet backgrounds. Avoid placing it over busy screenshots, noisy charts, or high-contrast gradients.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-3">
                <div className="font-semibold text-[#0a1b33] dark:text-white">Clear Space</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">At least icon width around the mark.</div>
              </div>
              <div className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-3">
                <div className="font-semibold text-[#0a1b33] dark:text-white">Minimum Size</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">24px height for digital UI.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="grid lg:grid-cols-[.95fr_1.05fr] gap-6 mb-6">
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-[#0a1b33] dark:text-white mb-5">Color System</h2>
          <div className="space-y-3">
            {brandColors.map(color => (
              <div key={color.hex} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 rounded-lg border border-slate-200/70 dark:border-zinc-800 p-3">
                <div className="h-10 rounded-md border border-black/5" style={{ background: color.hex }} />
                <div>
                  <div className="font-semibold text-sm text-[#0a1b33] dark:text-white">{color.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{color.use}</div>
                </div>
                <div className="font-mono text-xs text-slate-400">{color.hex}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-[#0a1b33] dark:text-white mb-5">Usage Rules</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Do', 'Use precise language: signal, watchlist, peak, entry, persistence.'],
              ['Do', 'Show risk notes plainly. Signd is a scanner, not financial advice.'],
              ['Avoid', 'Do not use moon language, guaranteed profit claims, or noisy hype styling.'],
              ['Avoid', 'Do not stretch, recolor, outline, or put effects behind the wordmark.'],
            ].map(([label, copy]) => (
              <div key={label + copy} className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-4">
                <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', label === 'Do' ? 'text-emerald-600' : 'text-red-400')}>{label}</div>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 p-6 shadow-sm mb-6">
        <h2 className="font-display text-xl font-semibold text-[#0a1b33] dark:text-white mb-5">Public References</h2>
        <div className="grid lg:grid-cols-3 gap-3 text-sm">
          <a href="https://x.com/Signdsol" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-4 text-slate-600 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Social</div>
            <div className="font-semibold">@Signdsol</div>
          </a>
          <div className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-4 text-slate-600 dark:text-slate-400">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">GMGN</div>
            <div className="font-mono text-xs break-all">https://gmgn.ai/sol/token/signd_&lt;contract&gt;</div>
          </div>
          <div className="rounded-lg border border-slate-200/70 dark:border-zinc-800 p-4 text-slate-600 dark:text-slate-400">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Axiom</div>
            <div className="font-mono text-xs break-all">https://axiom.trade/t/&lt;contract&gt;/@signd?chain=sol</div>
          </div>
        </div>
      </section>
      <section className="rounded-lg bg-[#0a1b33] text-white p-6 md:p-8 shadow-sm">
        <div className="grid md:grid-cols-[.8fr_1.2fr] gap-6 items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">Voice</div>
            <h2 className="font-display text-2xl font-semibold mb-3">Calm, direct, data-first.</h2>
            <p className="text-sm leading-relaxed text-slate-300">Signd sounds like a sharp scanner operator: terse when speed matters, specific when explaining data, and honest about uncertainty.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {['Quiet confidence, not hype.', 'Specific data before broad claims.', 'Clear risk language: not financial advice, always DYOR.'].map(line => (
              <div key={line} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-slate-200">{line}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [dark, setDark] = useState(false)
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-[#f9fafb] dark:bg-zinc-950 transition-colors duration-300">
        <TopNav dark={dark} toggleDark={() => setDark(d => !d)} />
        {path === '/docs' ? <DocsPage /> : path === '/brand-kit' ? <BrandKitPage /> : (
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
        )}
        <Footer />
      </div>
    </div>
  )
}
