"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        className="h-10 w-10 px-0"
      />
    );
  }

  const isDark = theme === "dark";

  function toggleThemeWithRipple(event: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = isDark ? "light" : "dark";
    const supportsViewTransitions =
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!supportsViewTransitions) {
      setTheme(nextTheme);
      return;
    }

    const { clientX, clientY } = event;
    const endRadius = Math.hypot(
      Math.max(clientX, window.innerWidth - clientX),
      Math.max(clientY, window.innerHeight - clientY)
    );

    const transition = (
      document as Document & {
        startViewTransition: (update: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${clientX}px ${clientY}px)`,
            `circle(${endRadius}px at ${clientX}px ${clientY}px)`,
          ],
        },
        {
          duration: 650,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  return (
    <Button
      variant="outline"
      className="h-10 w-10 px-0"
      onClick={toggleThemeWithRipple}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}