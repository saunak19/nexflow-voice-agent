"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = async () => {
    const nextTheme = isDark ? "light" : "dark";

    // Fallback: no View Transitions API support
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    // Get button position to anchor the ripple from top-right area
    const btn = buttonRef.current;
    const x = btn ? btn.getBoundingClientRect().right : window.innerWidth;
    const y = btn ? btn.getBoundingClientRect().top : 0;

    // Maximum radius — distance from top-right to bottom-left corner
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    await transition.ready;

    // Animate the new theme view expanding from top-right to bottom-left
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 600,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative inline-flex h-9 w-9 items-center justify-center rounded-xl
        border border-zinc-200 dark:border-zinc-700
        bg-white dark:bg-zinc-800
        text-zinc-600 dark:text-zinc-300
        shadow-sm
        transition-all duration-200
        hover:scale-105 hover:bg-zinc-100 dark:hover:bg-zinc-700
        hover:text-zinc-900 dark:hover:text-zinc-50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400
      `}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 rotate-0" />
      )}
    </button>
  );
}
