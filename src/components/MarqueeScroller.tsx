interface Logo {
  src: string
  alt: string
  gradient: { from: string; to: string }
}

const logos: Logo[] = [
  { src: 'https://svgl.app/library/solana.svg',      alt: 'Solana',      gradient: { from: '#9945FF', to: '#14F195' } },
  { src: 'https://svgl.app/library/ethereum.svg',    alt: 'Ethereum',    gradient: { from: '#627EEA', to: '#B8C9FF' } },
  { src: 'https://svgl.app/library/figma.svg',       alt: 'Figma',       gradient: { from: '#F24E1E', to: '#A259FF' } },
  { src: 'https://svgl.app/library/shopify.svg',     alt: 'Shopify',     gradient: { from: '#96BF48', to: '#5CB85C' } },
  { src: 'https://svgl.app/library/discord.svg',     alt: 'Discord',     gradient: { from: '#5865F2', to: '#7289DA' } },
  { src: 'https://svgl.app/library/vercel.svg',      alt: 'Vercel',      gradient: { from: '#333333', to: '#888888' } },
  { src: 'https://svgl.app/library/nextjs.svg',      alt: 'Next.js',     gradient: { from: '#000000', to: '#444444' } },
  { src: 'https://svgl.app/library/tailwindcss.svg', alt: 'Tailwind CSS', gradient: { from: '#06B6D4', to: '#0EA5E9' } },
]

function LogoCard({ logo }: { logo: Logo }) {
  return (
    <div className="group relative h-24 w-40 shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-700/60 shadow-sm hover:border-slate-300 dark:hover:border-zinc-600 transition-all overflow-hidden">
      <div
        className="absolute inset-0 opacity-0 scale-150 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out"
        style={{ background: `radial-gradient(circle at center, ${logo.gradient.from}22, ${logo.gradient.to}11)` }}
      />
      <img
        src={logo.src}
        alt={logo.alt}
        className="relative z-10 h-8 w-auto object-contain group-hover:brightness-0 group-hover:invert dark:brightness-0 dark:invert dark:group-hover:brightness-100 dark:group-hover:invert-0 transition-all duration-300"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}

export default function MarqueeScroller() {
  const doubled = [...logos, ...logos]

  return (
    <div className="relative mt-10 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
      }}
    >
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="marquee-track flex gap-4 w-max">
        {doubled.map((logo, i) => (
          <LogoCard key={`${logo.alt}-${i}`} logo={logo} />
        ))}
      </div>
    </div>
  )
}
