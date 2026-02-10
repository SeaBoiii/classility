import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import titleScene from '../assets/scenes/title.png'

export function LandingPage() {
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)

  const onStartAdventure = () => {
    if (opening) {
      return
    }

    setOpening(true)
    window.setTimeout(() => {
      navigate('/quiz')
    }, 620)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_15%,#342743_0%,#151621_52%,#09090f_100%)] px-5 py-10 text-[#f7ebd2] sm:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.5)_100%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center gap-8">
        <div className={['landing-hero-copy text-center', opening ? 'is-opening' : ''].join(' ')}>
          <p className="font-title text-xs tracking-[0.32em] text-[#d7ba81] uppercase">Classility</p>
          <h1 className="mt-2 font-title text-4xl text-[#f6deab] sm:text-6xl">The Hall of Archetypes</h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-[#dec9a2] sm:text-xl">
            Step through the gate, answer the trial, and reveal the class that best reflects your combat personality.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartAdventure}
          disabled={opening}
          className={[
            'landing-door-launch landing-door-frame relative aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#7f6136] bg-[radial-gradient(circle_at_center,#2f2220_0%,#201615_72%,#110d0c_100%)] text-left shadow-[0_30px_80px_rgba(0,0,0,0.55)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a5]',
            opening ? 'is-launching' : '',
          ].join(' ')}
          aria-label={opening ? 'Opening door' : 'Open door and start adventure'}
        >
          <div className={['landing-door-world', opening ? 'is-visible' : ''].join(' ')}>
            <img src={titleScene} alt="" loading="eager" />
            <div className="landing-door-world__veil" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(90,114,177,0.34)_0%,rgba(90,114,177,0)_58%)]" />
          <div className="landing-door-frame__trim" />
          <div className="landing-door-frame__inner" />

          <div
            className={[
              'landing-door landing-door--left absolute inset-y-0 left-0 z-20 w-1/2 border-r border-[#8e6f40] transition-[transform,filter] duration-[820ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              opening ? 'is-open' : '',
            ].join(' ')}
          >
            <DoorGlyph side="left" />
          </div>
          <div
            className={[
              'landing-door landing-door--right absolute inset-y-0 right-0 z-20 w-1/2 border-l border-[#8e6f40] transition-[transform,filter] duration-[820ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              opening ? 'is-open' : '',
            ].join(' ')}
          >
            <DoorGlyph side="right" />
          </div>

          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div
              className={[
                'rounded-xl border border-[#caa66a]/40 bg-[#130f11]/68 px-4 py-3 text-center backdrop-blur-[1px] transition duration-500 sm:px-6 sm:py-4',
                opening ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
              ].join(' ')}
            >
              <p className="font-title text-[0.62rem] tracking-[0.14em] text-[#efcf93] uppercase sm:text-sm sm:tracking-[0.2em]">
                {opening ? 'Opening...' : 'Click The Door To Begin'}
              </p>
              <p className="mt-1 font-body text-xs text-[#e2d2b2] sm:text-base">Your class awaits behind these doors.</p>
            </div>
          </div>
        </button>
      </section>
    </main>
  )
}

function DoorGlyph({ side }: { side: 'left' | 'right' }) {
  const handleX = side === 'left' ? 79 : 21

  return (
    <svg aria-hidden="true" className="h-full w-full opacity-70" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="6" y="6" width="88" height="88" fill="none" stroke="rgba(126,85,46,0.82)" strokeWidth="1.5" />
      <rect x="12" y="10" width="76" height="80" fill="none" stroke="rgba(222,183,119,0.36)" strokeWidth="1.1" />
      <rect x="17" y="16" width="66" height="28" fill="none" stroke="rgba(223,188,130,0.28)" strokeWidth="1.05" />
      <rect x="17" y="50" width="66" height="32" fill="none" stroke="rgba(223,188,130,0.28)" strokeWidth="1.05" />
      <path d="M20 28h60M20 63h60" stroke="rgba(255,224,167,0.18)" strokeWidth="1" />
      <path d="M22 18v70M30 18v70M38 18v70M46 18v70M54 18v70M62 18v70M70 18v70M78 18v70" stroke="rgba(67,42,23,0.3)" strokeWidth="0.8" />
      <ellipse cx={handleX} cy="61" rx="4.7" ry="3.8" fill="rgba(65,42,23,0.72)" />
      <circle cx={handleX} cy="61" r="2.8" fill="rgba(229,195,132,0.82)" />
      <circle cx={handleX + (side === 'left' ? -0.7 : 0.7)} cy="60.4" r="0.8" fill="rgba(255,243,211,0.9)" />
    </svg>
  )
}
