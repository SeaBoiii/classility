import { useNavigate } from 'react-router-dom'
import { dimensions } from '../lib/data'

export function DimensionsPage() {
  const navigate = useNavigate()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_22%_15%,#2a2035_0%,#14141e_54%,#0a0b11_100%)] px-4 pb-12 pt-8 text-[#f4ead4] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_16%,rgba(0,0,0,0.46)_100%)]" />

      <section className="relative mx-auto max-w-6xl">
        <header className="text-center">
          <p className="font-title text-xs tracking-[0.28em] text-[#d9bc83] uppercase">Know The Dimensions</p>
          <h1 className="mt-2 font-title text-4xl text-[#f8dfab] sm:text-5xl">How Your Class Is Measured</h1>
          <p className="mx-auto mt-4 max-w-3xl font-body text-lg text-[#dbc6a2]">
            Each answer shifts your profile across eight dimensions. Every axis runs from a low-expression trait to a
            high-expression trait.
          </p>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {dimensions.map((dimension) => (
            <article
              key={dimension.id}
              className="rounded-xl border border-[#6e5432]/70 bg-[linear-gradient(160deg,rgba(34,26,37,0.86)_0%,rgba(20,16,25,0.9)_100%)] p-5 shadow-[inset_0_0_26px_rgba(0,0,0,0.26)]"
            >
              <h2 className="font-title text-2xl text-[#f2d7a0]">{dimension.label}</h2>
              <p className="mt-2 font-body text-base text-[#e6d7bb]">{dimension.description ?? 'Core personality axis.'}</p>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between font-body text-sm text-[#ceb58d]">
                  <span>{dimension.left ?? 'Low'}</span>
                  <span>{dimension.right ?? 'High'}</span>
                </div>
                <div className="relative h-2 rounded-full bg-[#3a2d26]">
                  <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-[linear-gradient(90deg,#6e5030_0%,#9f7540_100%)] opacity-70" />
                  <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-[linear-gradient(90deg,#7d5d35_0%,#d3a55d_100%)] opacity-75" />
                  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6dca9] bg-[#241710]" />
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-9 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/quiz')}
            className="rounded-md border border-[#d4af67] bg-[linear-gradient(140deg,#6d4a24_0%,#8e6632_100%)] px-7 py-3 font-title text-sm tracking-[0.16em] uppercase text-[#fff1cb] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe1ad]"
          >
            Continue To Questions
          </button>
        </div>
      </section>
    </main>
  )
}
