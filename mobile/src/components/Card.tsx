import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import theme from '@/theme';

export type CardProps = {
  header?: React.ReactNode;
  elevated?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
};

export default function Card({ header, elevated = true, style, children }: CardProps) {
  return (
    <View style={[styles.container, elevated ? theme.elevation('md') : null, style] as ViewStyle[]}>
      {header ? (
        typeof header === 'string' ? (
          <Text style={styles.header}>{header}</Text>
        ) : (
          <View style={styles.headerContainer}>{header}</View>
        )
      ) : null}
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.getRadius('md'),
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(4),
  },
  header: {
    ...theme.typography.subtitle,
    marginBottom: theme.spacing(3),
  },
  headerContainer: {
    marginBottom: theme.spacing(3),
  },
});
