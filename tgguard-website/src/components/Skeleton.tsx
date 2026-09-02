import { cn } from '../lib/utils'

interface Props { className?: string; count?: number }
export default function Skeleton({ className, count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('animate-pulse bg-white/[0.04] rounded-xl', className)} />
      ))}
    </>
  )
}
