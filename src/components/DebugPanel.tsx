import clsx from 'clsx'
import type { ResultDebug, ScoringSummary } from '../types'

interface DebugPanelProps {
  open: boolean
  onToggle: () => void
  debug: ResultDebug[]
  summary: ScoringSummary
}

export function DebugPanel({ open, onToggle, debug, summary }: DebugPanelProps) {
  return (
    <section className="fixed bottom-5 right-5 z-40 max-w-[440px]">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-md border border-[#d9b56d]/70 bg-[#171318]/90 px-4 py-2 font-title text-xs tracking-[0.2em] text-[#f1d59c] uppercase transition hover:bg-[#232028] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6d698]"
      >
        {open ? 'Hide Debug' : 'Show Debug'}
      </button>

      {open && (
        <div className="mt-2 max-h-[72vh] overflow-auto rounded-lg border border-[#3d2d1d] bg-[#0f0d12]/95 p-4 font-mono text-xs text-[#f1ede2] shadow-2xl">
          <div className="space-y-1 pb-3">
            <p>
              top: <strong>{summary.top.dim}</strong> ({summary.top.score})
            </p>
            <p>
              second: <strong>{summary.second.dim}</strong> ({summary.second.score})
            </p>
            <p>
              total: <strong>{summary.total}</strong>, spread: <strong>{summary.spread}</strong>
            </p>
            <p>ranks: {summary.ordered.map((item) => `${item.rank}.${item.dim}(${item.score})`).join(' | ')}</p>
          </div>

          <div className="space-y-3 border-t border-[#3d2d1d] pt-3">
            {debug.map((entry) => (
              <div key={entry.result.id} className="rounded border border-[#3c2d1e] bg-[#1a161c]/75 p-2">
                <p className={clsx('font-semibold', entry.passed ? 'text-emerald-300' : 'text-rose-300')}>
                  {entry.passed ? 'PASS' : 'FAIL'} {entry.result.id} (p={entry.result.priority})
                </p>
                {entry.checks.length === 0 && <p className="text-[#bfb5a2]">No conditions</p>}
                <ul className="mt-1 space-y-1">
                  {entry.checks.map((check, index) => (
                    <li key={`${entry.result.id}-${index}`} className="text-[11px]">
                      <span className={check.passed ? 'text-emerald-300' : 'text-rose-300'}>
                        [{check.passed ? 'ok' : 'no'}]
                      </span>{' '}
                      {check.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
