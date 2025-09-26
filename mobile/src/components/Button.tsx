import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import theme from '@/theme';

type Variant = 'filled' | 'outline' | 'ghost';
type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error';

export type ButtonProps = {
  title?: string;
  children?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

const toneColor = (tone: Tone) => {
  switch (tone) {
    case 'accent': return theme.colors.accent;
    case 'success': return theme.colors.success;
    case 'warning': return theme.colors.warning;
    case 'error': return theme.colors.error;
    default: return theme.colors.primary;
  }
};

export default function Button({ title, children, onPress, variant = 'filled', tone = 'primary', disabled, loading, error, accessibilityLabel, testID }: ButtonProps) {
  const color = error ? theme.colors.error : toneColor(tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, focused }) => [
        styles.base,
        variant === 'filled' && { backgroundColor: color },
        variant === 'outline' && { borderColor: color, borderWidth: 1 },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (pressed || focused) && { opacity: 0.88, shadowOpacity: 0.35 },
        (disabled || loading) && { opacity: theme.states.disabledAlpha },
      ] as ViewStyle[]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'filled' ? theme.colors.text : color} />
      ) : (
        <Text style={[
          styles.label,
          variant === 'filled' ? { color: theme.colors.text } : { color },
        ]}>
          {title || children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.getRadius('sm'),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.elevation('sm'),
  },
  label: {
    ...theme.typography.button,
  },
});
