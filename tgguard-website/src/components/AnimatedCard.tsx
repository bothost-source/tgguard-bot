import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface Props {
  children: ReactNode
  delay?: number
  className?: string
}

export default function AnimatedCard({ children, delay = 0, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className={cn('glass-card p-6', className)}
    >
      {children}
    </motion.div>
  )
}
