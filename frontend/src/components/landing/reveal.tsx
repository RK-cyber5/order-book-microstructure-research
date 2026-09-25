"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

/** Subtle scroll-reveal used across sections. Honors prefers-reduced-motion. */
export function Reveal({ children, delay = 0, y = 18, className, once = true }: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0.01 : 0.62,
        delay: reduce ? 0 : delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-12% 0px -8% 0px" }}
    >
      {children}
    </motion.div>
  );
}
