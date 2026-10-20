import { Text, TextProps } from 'react-native';

import { typography } from '../theme';

type Props = TextProps & { variant?: keyof typeof typography };

// Text that takes a step from the theme's text ladder, so screens never set fontSize themselves.
export function AppText({ variant = 'body', style, ...rest }: Props) {
  return <Text {...rest} style={[typography[variant], style]} />;
}
