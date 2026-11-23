import { useTheme } from '../context/ThemeContext';

export interface ChartThemeTokens {
  gridStroke: string;
  axisStroke: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  radarGrid: string;
  radarRadius: string;
}

export function useChartTheme(): ChartThemeTokens {
  const { theme } = useTheme();

  if (theme === 'light') {
    return {
      gridStroke: '#e2e8f0', // slate-200
      axisStroke: '#64748b', // slate-500
      tooltipBg: '#ffffff',
      tooltipBorder: '#cbd5e1', // slate-300
      tooltipText: '#0f172a', // slate-900
      radarGrid: '#cbd5e1', // slate-300
      radarRadius: '#94a3b8', // slate-400
    };
  }

  return {
    gridStroke: '#1e293b', // slate-800
    axisStroke: '#64748b', // slate-500
    tooltipBg: '#0f172a', // slate-900
    tooltipBorder: '#334155', // slate-700
    tooltipText: '#f8fafc', // slate-50
    radarGrid: '#334155',
    radarRadius: '#475569',
  };
}
