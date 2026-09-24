import { StyleSheet, Text, View } from 'react-native';

export default function Food() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Food</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});
