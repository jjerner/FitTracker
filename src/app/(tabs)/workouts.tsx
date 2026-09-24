import { StyleSheet, Text, View } from 'react-native';

export default function Workouts() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workouts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});
