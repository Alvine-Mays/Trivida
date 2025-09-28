import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import theme from '@/theme';

export type InputProps = TextInputProps & {
  label?: string;
  caption?: string;
  errorText?: string;
};

export default function Input({ label, caption, errorText, secureTextEntry, editable = true, ...rest }: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const hasError = Boolean(errorText);

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        secureTextEntry={secureTextEntry}
        editable={editable}
        onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
        placeholderTextColor={theme.colors.textSecondary}
        style={[
          styles.input,
          focused && { borderColor: theme.states.focusRing },
          hasError && { borderColor: theme.colors.error },
          !editable && { opacity: theme.states.disabledAlpha },
        ]}
        accessibilityLabel={label}
        accessibilityHint={caption}
        accessibilityState={{ disabled: !editable, invalid: hasError }}
      />
      {hasError ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : caption ? (
        <Text style={styles.caption}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing(1),
  },
  input: {
    height: 48,
    borderRadius: theme.getRadius('sm'),
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(3),
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    ...theme.typography.body,
  },
  caption: {
    marginTop: theme.spacing(1),
    ...theme.typography.caption,
  },
  error: {
    marginTop: theme.spacing(1),
    ...theme.typography.caption,
    color: theme.colors.error,
  },
});
