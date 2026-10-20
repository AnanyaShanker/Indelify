// False on touch screens, where a tap fires mouseenter but no mouseleave
// until the next tap elsewhere — so JS hover styles would stick.
export const canHover = typeof window === 'undefined' || typeof window.matchMedia !== 'function'
  || window.matchMedia('(hover: hover)').matches
