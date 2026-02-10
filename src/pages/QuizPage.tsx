import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextureOverlay } from '../components/TextureOverlay'
import { questionsData } from '../lib/data'
import { saveAttempt } from '../lib/storage'

type FlipPhase = 'idle' | 'out' | 'in'

const FADE_OUT_MS = 180
const FADE_IN_MS = 220

export function QuizPage() {
  const navigate = useNavigate()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [flipPhase, setFlipPhase] = useState<FlipPhase>('idle')
  const [answers, setAnswers] = useState<number[]>(() =>
    Array.from({ length: questionsData.questions.length }, () => -1),
  )
  const flipTimersRef = useRef<number[]>([])

  const totalQuestions = questionsData.questions.length
  const question = questionsData.questions[questionIndex]
  const questionImage = question.image?.trim() ?? ''
  const selectedOption = answers[questionIndex]
  const progress = questionIndex + 1
  const isFlipping = flipPhase !== 'idle'

  const clearFlipTimers = () => {
    for (const timerId of flipTimersRef.current) {
      window.clearTimeout(timerId)
    }
    flipTimersRef.current = []
  }

  const scheduleFlipTimer = (callback: () => void, delayMs: number) => {
    const timerId = window.setTimeout(callback, delayMs)
    flipTimersRef.current.push(timerId)
  }

  useEffect(() => {
    return () => {
      clearFlipTimers()
    }
  }, [])

  const runFlipTransition = (nextIndex: number) => {
    if (isFlipping || nextIndex === questionIndex || nextIndex < 0 || nextIndex >= totalQuestions) {
      return
    }

    clearFlipTimers()
    setFlipPhase('out')

    scheduleFlipTimer(() => {
      setQuestionIndex(nextIndex)
      setFlipPhase('in')

      scheduleFlipTimer(() => {
        setFlipPhase('idle')
      }, FADE_IN_MS)
    }, FADE_OUT_MS)
  }

  const commitAnswer = (optionIndex: number) => {
    if (isFlipping) {
      return
    }

    const nextAnswers = [...answers]
    nextAnswers[questionIndex] = optionIndex
    setAnswers(nextAnswers)

    if (questionIndex < totalQuestions - 1) {
      runFlipTransition(questionIndex + 1)
      return
    }

    saveAttempt({
      answers: nextAnswers,
      createdAt: new Date().toISOString(),
    })

    navigate('/result', {
      state: {
        answers: nextAnswers,
      },
    })
  }

  const flipClass = flipPhase === 'out' ? 'is-fading-out' : flipPhase === 'in' ? 'is-fading-in' : ''

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#2a1e2e_0%,#111018_48%,#0b0a10_100%)] p-6 text-[#f3e7cf] sm:p-10">
      <TextureOverlay opacity={0.26} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.4)_100%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
        <div className="arcane-panel w-full animate-fade-slide rounded-2xl border border-[#9b7c49]/35 bg-[linear-gradient(160deg,rgba(31,24,35,0.95)_0%,rgba(17,13,21,0.94)_100%)] p-7 shadow-2xl sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <p className="font-title text-xs tracking-[0.2em] text-[#d8b978] uppercase">RPG Class Aptitude</p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm text-[#e5d5b6]">
              <span className="font-title tracking-[0.18em] uppercase">Question {progress}/{totalQuestions}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#3a2a26]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#7f5d2e_0%,#dfbe7e_100%)] transition-all duration-300"
                style={{ width: `${(progress / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <div className="question-fade-stage mt-7" aria-busy={isFlipping}>
            <div key={question.id} className={['question-fade-sheet', flipClass].join(' ')}>
              <h1 className="font-body text-[1.72rem] leading-tight text-[#f3e9d3] sm:text-[2rem]">{question.prompt}</h1>

              {questionImage && (
                <div className="mt-5 overflow-hidden rounded-xl border border-[#6e5434] bg-[#120f15]">
                  <div className="aspect-[16/9] w-full">
                    <img
                      src={questionImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-7 grid gap-3 sm:gap-4">
                {question.options.map((option, index) => {
                  const selected = selectedOption === index
                  return (
                    <button
                      key={option.text}
                      type="button"
                      onClick={() => commitAnswer(index)}
                      disabled={isFlipping}
                      className={[
                        'option-btn group relative rounded-xl border px-4 py-4 text-left font-body text-lg leading-snug transition sm:px-6 sm:py-5',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a2]',
                        'disabled:cursor-not-allowed disabled:opacity-70',
                        selected
                          ? 'border-[#e4c382] bg-[linear-gradient(120deg,rgba(89,62,29,0.85)_0%,rgba(138,102,53,0.8)_100%)] text-[#fff2d4]'
                          : 'border-[#6b5536] bg-[linear-gradient(140deg,rgba(31,24,35,0.95)_0%,rgba(19,16,24,0.95)_100%)] text-[#e8dbc1] hover:border-[#d9b56c] hover:text-[#fff2d2]',
                      ].join(' ')}
                      aria-pressed={selected}
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        <span className="font-title text-xs tracking-[0.18em] text-[#e0be7b] uppercase">{index + 1}</span>
                        <span>{option.text}</span>
                      </span>
                      <span aria-hidden="true" className="option-shimmer" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => runFlipTransition(questionIndex - 1)}
              disabled={questionIndex === 0 || isFlipping}
              className="rounded-md border border-[#8a6a3c] px-4 py-2 font-title text-xs tracking-[0.18em] uppercase text-[#e6c98d] transition hover:border-[#dcb96f] hover:text-[#f7dfab] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe1a9]"
            >
              Back
            </button>

            <p className="font-body text-sm text-[#ccb68b]">
              {questionIndex === totalQuestions - 1 ? 'Final choice unlocks your class.' : 'Choose one to continue.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
