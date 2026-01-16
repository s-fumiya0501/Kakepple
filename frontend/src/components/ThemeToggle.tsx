'use client';

import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return '💻';
    }
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'light') return 'ライト';
    if (theme === 'dark') return 'ダーク';
    return 'システム';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="gap-2"
      title={`現在: ${getLabel()} (クリックで切替)`}
    >
      <span className="text-lg">{getIcon()}</span>
      <span className="hidden sm:inline text-xs">{getLabel()}</span>
    </Button>
  );
}
