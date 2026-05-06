import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Moon, Sun, Zap, Shield, Clock, Trophy, ArrowUpDown, ExternalLink } from 'lucide-react'
import { cn } from './lib/utils'
import MarqueeScroller from './components/MarqueeScroller'

// ── Types ────────────────────────────────────────────────────────────────────
type SignalBadgeType = 'STRONG' | 'MEDIUM' | 'LOW'

// ── Signal Badge Component ───────────────────────────────────────────────────
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

// ── Hero Dashboard Mockup ─────────────────────────────────────────────────────


// ── Hero Section ──────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden h-[600px] flex flex-col">

      {/* Video background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4"
          autoPlay loop muted playsInline
          className="w-full h-full object-cover scale-105 transition-transform duration-1000 opacity-30 dark:opacity-20"
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* live pill */}
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
          MemeSight watches 25 migrated Solana meme coins 24/7 — scoring each one with AI-powered buy signals and exit recommendations, refreshed every 5 minutes. Know when to get in. Know when to get out.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <motion.a
            href="/memesight.html"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Connect Wallet &amp; View Signals
            <ChevronRight size={14} />
          </motion.a>
        </div>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Free to use. No email. Just your wallet.</p>

        {/* show badge examples */}
        <div className="flex items-center gap-2 mt-5">
          <SignalBadge type="STRONG" />
          <SignalBadge type="MEDIUM" />
          <SignalBadge type="LOW" />
        </div>
      </motion.div>

      <motion.div
        className="absolute right-6 bottom-28 z-10 w-[min(520px,42vw)] hidden lg:block"
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
      >
  
      </motion.div>

      {/* Floating bottom navbar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <motion.nav
          className="flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-200/40 dark:border-zinc-700/40 gap-1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
        >
          {/* Logo */}
          <div className="w-9 h-9 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 shadow-sm rounded-full flex items-center justify-center text-sm text-slate-700 dark:text-slate-300 flex-shrink-0">
            ✦
          </div>

          {/* Nav links */}
          {['How it works', 'Features', 'Roadmap'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="px-4 py-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors rounded-full"
            >
              {label}
            </a>
          ))}

          {/* CTA */}
          <a
            href="/memesight.html"
            className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-5 py-2 rounded-full text-[12px] font-semibold text-[#0a1b33] dark:text-white border border-slate-200/60 dark:border-zinc-600/60 shadow-sm hover:border-slate-300 dark:hover:border-zinc-500 transition-all"
          >
            Open Dashboard
            <ChevronRight size={11} />
          </a>
        </motion.nav>
      </div>
    </section>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { icon: '👛', step: 'Step 1', title: 'Connect your wallet',    desc: 'Login instantly with Phantom or Solflare. No signup, no email, no password.' },
  { icon: '📊', step: 'Step 2', title: 'See live signals',       desc: 'View AI-generated buy signals and exit recommendations for 25 migrated meme coins, updated every 5 minutes.' },
  { icon: '⚡', step: 'Step 3', title: 'Trade with confidence',  desc: 'Click Buy on any signal to go straight to Pump.fun or GMGN and execute your trade.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">How MemeSight works</h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-5">
        {steps.map(s => (
          <div key={s.step} className="group rounded-3xl p-8 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">{s.icon}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">{s.step}</div>
            <h3 className="font-display text-lg font-semibold text-[#0a1b33] dark:text-white mb-3">{s.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
const features = [
  { icon: Zap,          title: 'AI Buy Signals',        desc: 'Every coin is scored every 5 minutes. Get STRONG, MEDIUM, or LOW signals — no noise, just decisions.', badges: true },
  { icon: Shield,       title: 'Migrated Coins Only',   desc: 'We only track coins that have fully migrated from Pump.fun with a market cap above $5K. No rugs, no pre-migration hype.' },
  { icon: Clock,        title: 'Exit Recommendations',  desc: 'Know when to exit — signals come with suggested time windows (10min, 1hr, 4hr, 12hr) based on volatility.' },
  { icon: Trophy,       title: 'Top 5 Performers',      desc: 'The 5 strongest signals are highlighted at the top so you never miss the best opportunity.' },
  { icon: ArrowUpDown,  title: 'Sortable Watchlist',    desc: 'View all 25 coins sorted by market cap. Spot the small caps with big potential instantly.' },
  { icon: ExternalLink, title: 'Direct to Exchange',    desc: 'One click takes you to Pump.fun or GMGN to execute your trade. No copy-paste, no hunting.' },
]

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">
          Everything you need to trade meme coins smarter
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(f => (
          <div key={f.title} className="group rounded-3xl p-7 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
              <f.icon size={18} className="text-[#0a1b33] dark:text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-base font-semibold text-[#0a1b33] dark:text-white mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {f.title === 'AI Buy Signals'
                ? <>{f.desc.split('STRONG')[0]}<SignalBadge type="STRONG" />{', '}<SignalBadge type="MEDIUM" />{', or '}<SignalBadge type="LOW" />{' signals — no noise, just decisions.'}</>
                : f.desc
              }
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
const phases = [
  {
    num: '1', title: 'Premium Plan', status: 'Coming soon', statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/40', active: true,
    tagline: 'For traders who need speed.',
    items: ['Signal refresh every 1 minute instead of 5', 'Priority access to new coin additions', 'Signal history (last 24 hours)', 'Early access to future features'],
  },
  {
    num: '2', title: 'AI Trading Agent', status: 'In development', statusColor: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/50 border-slate-200/50 dark:border-zinc-700/40', active: false,
    tagline: 'Let the AI trade alongside you.',
    items: ['AI agent monitors signals and alerts via Telegram or browser notifications', 'Auto-summarizes market conditions across all 25 coins', 'Highlights sudden volatility spikes as they happen', 'Gives a daily meme coin market brief'],
  },
  {
    num: '3', title: 'Personalized Recommendations', status: 'Future', statusColor: 'text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-900/50 border-slate-100/50 dark:border-zinc-800/30', active: false,
    tagline: 'Signals built around your history.',
    items: "Connect your wallet's trade history|AI learns your risk tolerance, preferred hold time, and past wins/losses|Recommendations tailored to your trading style — not generic signals|Track your performance over time with a personal P&L dashboard".split('|'),
  },
]

function Roadmap() {
  return (
    <section id="roadmap" className="py-24">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#0a1b33] dark:text-white mb-3 tracking-tight">What's coming next</h2>
      </div>
      <div className="relative max-w-3xl mx-auto">
        {/* vertical line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-emerald-400/40 via-slate-200 dark:via-zinc-700 to-transparent hidden sm:block" />
        <div className="space-y-5">
          {phases.map(p => (
            <div key={p.num} className="sm:pl-16 relative">
              <div className={cn(
                'absolute left-0 top-7 w-12 h-12 rounded-full border-2 items-center justify-center text-sm font-bold hidden sm:flex',
                p.active ? 'border-emerald-500 bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-400 dark:text-zinc-500',
              )}>{p.num}</div>
              <div className={cn(
                'rounded-3xl p-7 bg-white dark:bg-zinc-900 border transition-all',
                p.active ? 'border-emerald-200/60 dark:border-emerald-800/30 shadow-sm' : 'border-slate-200/60 dark:border-zinc-800',
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
                      {item.includes('1 minute') ? <><strong className="text-[#0a1b33] dark:text-white">1 minute</strong> instead of 5{item.split('1 minute instead of 5')[1]}</> : item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
      <div className="relative text-center rounded-[48px] px-8 py-20 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 shadow-sm">
        {/* subtle glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(29,158,117,0.07), transparent)' }} />
        <div className="relative z-10">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-[#0a1b33] dark:text-white mb-4 tracking-tight">Ready to trade smarter?</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 max-w-md mx-auto">
            Join MemeSight for free. Connect your wallet and get your first signals in seconds.
          </p>
          <motion.a
            href="/memesight.html"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Connect Wallet
            <ChevronRight size={16} />
          </motion.a>
        </div>
      </div>
    </section>
  )
}

// ── Top Sticky Navbar ─────────────────────────────────────────────────────────
function TopNav({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-zinc-800/60 backdrop-blur-sm bg-[#f9fafb]/80 dark:bg-zinc-950/80">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-bold text-[#0a1b33] dark:text-white tracking-tight">
          MemeSight <span>🚀</span>
        </a>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-500 dark:text-slate-400 hover:text-[#0a1b33] dark:hover:text-white transition-colors shadow-sm"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <a
            href="/memesight.html"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0a152d] dark:bg-emerald-600 text-white text-sm font-semibold transition-opacity hover:opacity-90 shadow-sm"
          >
            Connect Wallet
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
          <div className="font-bold text-[#0a1b33] dark:text-white text-sm">
            MemeSight 🚀 <span className="font-normal text-slate-400 dark:text-zinc-500">— AI signals for Solana meme coins</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-right max-w-sm leading-relaxed">
            <em>MemeSight provides algorithmic signals for informational purposes only. Not financial advice. Always do your own research.</em>
          </p>
        </div>
        <div className="border-t border-slate-200/40 dark:border-zinc-800/40 pt-5 text-xs text-center text-slate-400 dark:text-zinc-600">
          © 2025 MemeSight
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
            <MarqueeScroller />
            <HowItWorks />
            <Features />
            <Roadmap />
            <CTABanner />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
