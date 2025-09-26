import { VictoryThemeDefinition } from 'victory-native';

const palette = ['#2979FF', '#00E5FF', '#22C55E', '#F59E0B', '#FF4C4C'];
const grid = '#1F1F1F';
const axis = '#B0B0B0';
const text = '#FFFFFF';

const baseLabel = {
  fill: axis,
  fontFamily: 'Roboto_400Regular',
  fontSize: 12,
};

export const victoryTheme: VictoryThemeDefinition = {
  axis: {
    style: {
      axis: { stroke: axis },
      grid: { stroke: grid, strokeDasharray: '4,4' },
      ticks: { stroke: axis, size: 4 },
      tickLabels: baseLabel,
      axisLabel: { ...baseLabel, fontSize: 14, fill: text },
    },
    padding: 50,
    colorScale: palette,
  },
  line: {
    style: {
      data: { strokeWidth: 2 },
      labels: { ...baseLabel, fill: text },
    },
    colorScale: palette,
  },
  bar: {
    style: {
      data: { strokeWidth: 0 },
      labels: { ...baseLabel, fill: text },
    },
    colorScale: palette,
  },
  scatter: {
    style: {
      data: { size: 4 },
      labels: { ...baseLabel, fill: text },
    },
    colorScale: palette,
  },
};

export default victoryTheme;
