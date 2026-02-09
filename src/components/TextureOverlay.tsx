import clsx from 'clsx'

interface TextureOverlayProps {
  className?: string
  opacity?: number
}

export function TextureOverlay({ className, opacity = 0.32 }: TextureOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx('pointer-events-none absolute inset-0', className)}
      style={{
        opacity,
        backgroundImage: [
          'radial-gradient(circle at 20% 15%, rgba(255, 240, 204, 0.24) 0%, rgba(255, 240, 204, 0) 42%)',
          'radial-gradient(circle at 80% 20%, rgba(120, 94, 48, 0.3) 0%, rgba(120, 94, 48, 0) 42%)',
          'linear-gradient(120deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.14) 100%)',
          'repeating-radial-gradient(circle at 0 0, rgba(0, 0, 0, 0.12) 0 1px, rgba(0, 0, 0, 0) 1px 3px)',
        ].join(','),
        backgroundBlendMode: 'screen, overlay, soft-light, multiply',
      }}
    />
  )
}
