import { Text, TextProps } from 'react-native';

import { typography } from '../theme';

type Props = TextProps & { variant?: keyof typeof typography };

// Text that takes a step from the theme's text ladder, so screens never set fontSize themselves.
export function AppText({ variant = 'body', style, ...rest }: Props) {
  // Section titles are announced as headings, so screen-reader users can jump between them.
  const role = variant === 'heading' ? 'header' : undefined;
  return <Text accessibilityRole={role} {...rest} style={[typography[variant], style]} />;
}
