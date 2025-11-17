import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, clearUser } from '../store/slices/userSlice';

const Profile = () => {
  const user = useSelector((s) => s.user);
  const dispatch = useDispatch();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user && user.isLoggedIn ? (
        <>
          <Text style={styles.subtitle}>Name: {user.name ?? '—'}</Text>
          <Text style={styles.subtitle}>Email: {user.email ?? '—'}</Text>
          <TouchableOpacity onPress={() => dispatch(clearUser())} style={styles.button}>
            <Text style={styles.buttonText}>Logout (clear slice)</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>No user in store</Text>
          <TouchableOpacity onPress={() => dispatch(setUser({ name: 'Demo User', email: 'demo@example.com', token: 'demo-token' }))} style={styles.button}>
            <Text style={styles.buttonText}>Set Demo User (setUser)</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Profile;
