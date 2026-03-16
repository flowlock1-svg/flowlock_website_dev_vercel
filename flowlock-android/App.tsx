import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert } from 'react-native';
import { supabase } from './src/supabase';
import { Session } from '@supabase/supabase-js';

// Native Android module to check and start usage stats
// For pure JS we only mock the UI. In a real expo/RN app, 
// you'd write a Swift/Kotlin module bridging `UsageStatsManager`

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [trackingScore, setTrackingScore] = useState(0);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    async function signInWithEmail() {
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) Alert.alert(error.message);
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    function toggleTracking() {
        // In a real native module this invokes usage tracking service
        setIsTracking(!isTracking);

        if (!isTracking) {
            Alert.alert(
                "Permissions Required",
                "If this was a full native build, you would be redirected to Android Settings to grant 'Usage Access' permission here."
            );
        }
    }

    if (!session) {
        return (
            <View style={styles.container}>
                <Text style={styles.header}>FlowLock Android</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                <Button title="Sign In" onPress={signInWithEmail} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>FlowLock Dashboard</Text>
            <Text style={styles.text}>Welcome, {session.user.email}</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Background Tracking</Text>
                <Text style={styles.text}>
                    Status: {isTracking ? "Active" : "Inactive"}
                </Text>
                <View style={styles.separator} />
                <Button
                    title={isTracking ? "Stop Tracking" : "Start Tracking Session"}
                    color={isTracking ? "#ef4444" : "#10b981"}
                    onPress={toggleTracking}
                />
            </View>

            <View style={styles.separator} />
            <Button title="Sign Out" onPress={signOut} color="#6b7280" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#111827',
    },
    input: {
        width: '100%',
        height: 48,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
        backgroundColor: 'white',
    },
    text: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 16,
    },
    card: {
        width: '100%',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        elevation: 2,
        marginVertical: 16
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1f2937'
    },
    separator: {
        height: 16,
    }
});
