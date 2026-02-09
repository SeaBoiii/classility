import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function LandingPage() {
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)

  const onStartAdventure = () => {
    if (opening) {
      return
    }

    setOpening(true)
    window.setTimeout(() => {
      navigate('/dimensions')
    }, 900)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_15%,#342743_0%,#151621_52%,#09090f_100%)] px-5 py-10 text-[#f7ebd2] sm:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.5)_100%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="font-title text-xs tracking-[0.32em] text-[#d7ba81] uppercase">Classility</p>
          <h1 className="mt-2 font-title text-4xl text-[#f6deab] sm:text-6xl">The Hall of Archetypes</h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-[#dec9a2] sm:text-xl">
            Step through the gate, answer the trial, and reveal the class that best reflects your combat personality.
          </p>
        </div>

        <div className="relative aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#7f6136] bg-[radial-gradient(circle_at_center,#2f2220_0%,#201615_72%,#110d0c_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(90,114,177,0.34)_0%,rgba(90,114,177,0)_58%)]" />

          <div
            className={[
              'absolute inset-y-0 left-0 w-1/2 border-r border-[#8e6f40] bg-[linear-gradient(160deg,#503622_0%,#3d291a_52%,#2f1f14_100%)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              opening ? '-translate-x-full' : 'translate-x-0',
            ].join(' ')}
          >
            <DoorGlyph />
          </div>
          <div
            className={[
              'absolute inset-y-0 right-0 w-1/2 border-l border-[#8e6f40] bg-[linear-gradient(200deg,#4f3521_0%,#392619_52%,#2e1e13_100%)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              opening ? 'translate-x-full' : 'translate-x-0',
            ].join(' ')}
          >
            <DoorGlyph />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-[#caa66a]/40 bg-[#130f11]/68 px-6 py-4 text-center backdrop-blur-[1px]">
              <p className="font-title text-sm tracking-[0.2em] text-[#efcf93] uppercase">Begin The Trial</p>
              <p className="mt-1 font-body text-base text-[#e2d2b2]">Your class awaits behind these doors.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartAdventure}
          disabled={opening}
          className="rounded-md border border-[#d5b06a] bg-[linear-gradient(140deg,#6f4b22_0%,#8e6531_100%)] px-7 py-3 font-title text-sm tracking-[0.18em] uppercase text-[#fff0cd] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a5]"
        >
          {opening ? 'Opening...' : 'Start Adventure'}
        </button>
      </section>
    </main>
  )
}

function DoorGlyph() {
  return (
    <svg aria-hidden="true" className="h-full w-full opacity-70" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="9" y="8" width="82" height="84" fill="none" stroke="rgba(215,178,115,0.35)" strokeWidth="1.2" />
      <rect x="16" y="14" width="68" height="72" fill="none" stroke="rgba(215,178,115,0.22)" strokeWidth="1" />
      <path d="M50 22 60 34 50 46 40 34Z" fill="none" stroke="rgba(230,194,132,0.5)" strokeWidth="1.2" />
      <path d="M22 52H78M22 64H78" stroke="rgba(214,176,109,0.28)" strokeWidth="1.2" />
      <circle cx="50" cy="76" r="2.6" fill="rgba(228,194,132,0.55)" />
    </svg>
  )
}
