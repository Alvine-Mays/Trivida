export type ChartsTheme = {
  palette: string[];
  axisColor: string;
  gridColor: string;
  tooltip: {
    bg: string;
    text: string;
    border: string;
  };
};

export const chartsTheme: ChartsTheme = {
  palette: ['#2979FF', '#00E5FF', '#22C55E', '#F59E0B', '#FF4C4C'],
  axisColor: '#B0B0B0',
  gridColor: '#1F1F1F',
  tooltip: {
    bg: 'rgba(0,0,0,0.8)',
    text: '#FFFFFF',
    border: '#2A2A2A',
  },
};

export const getChartColor = (i: number) => chartsTheme.palette[i % chartsTheme.palette.length];
