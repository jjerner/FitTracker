import { StyleSheet, Text, View } from 'react-native';

import { useDisplayName } from '../../hooks/useDisplayName';

export default function Home() {
  const { data: name } = useDisplayName();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{name ? `Hi, ${name}!` : 'Hi!'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});
