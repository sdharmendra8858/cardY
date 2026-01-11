/**
 * Encryption Verification Debug Component
 * 
 * Displays encryption verification test results
 * Only shown in development mode
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runAllVerificationTests } from '../utils/encryption/verifyEncryption';

interface TestResult {
    name: string;
    passed: boolean;
    result: any;
}

export function EncryptionVerificationDebug() {
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [allPassed, setAllPassed] = useState<boolean | null>(null);

    const handleRunTests = async () => {
        setIsRunning(true);
        try {
            const results = await runAllVerificationTests();
            setTestResults(results.tests);
            setAllPassed(results.allPassed);
        } catch (error) {
            console.error('Error running tests:', error);
            setAllPassed(false);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔐 Encryption Verification</Text>

            <TouchableOpacity
                style={[styles.button, isRunning && styles.buttonDisabled]}
                onPress={handleRunTests}
                disabled={isRunning}
            >
                <Text style={styles.buttonText}>
                    {isRunning ? 'Running Tests...' : 'Run Verification Tests'}
                </Text>
            </TouchableOpacity>

            {allPassed !== null && (
                <View style={[styles.statusBox, allPassed ? styles.statusPassed : styles.statusFailed]}>
                    <Text style={styles.statusText}>
                        {allPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
                    </Text>
                </View>
            )}

            {testResults && (
                <ScrollView style={styles.resultsContainer}>
                    {testResults.map((test, index) => (
                        <View key={index} style={styles.testResult}>
                            <Text style={[styles.testName, test.passed ? styles.passed : styles.failed]}>
                                {test.passed ? '✅' : '❌'} {test.name}
                            </Text>
                            <Text style={styles.testDetails}>{test.result.details}</Text>

                            {test.result.plaintext && (
                                <Text style={styles.testData}>
                                    Plaintext: {test.result.plaintext}
                                </Text>
                            )}

                            {test.result.ciphertext1 && (
                                <>
                                    <Text style={styles.testData}>
                                        Ciphertext 1: {test.result.ciphertext1}
                                    </Text>
                                    <Text style={styles.testData}>
                                        Ciphertext 2: {test.result.ciphertext2}
                                    </Text>
                                </>
                            )}

                            {test.result.masterKeyHex && (
                                <Text style={styles.testData}>
                                    Master Key: {test.result.masterKeyHex}
                                </Text>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginVertical: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    statusBox: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 16,
        alignItems: 'center',
    },
    statusPassed: {
        backgroundColor: '#d4edda',
    },
    statusFailed: {
        backgroundColor: '#f8d7da',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    resultsContainer: {
        maxHeight: 400,
        backgroundColor: '#fff',
        borderRadius: 6,
        padding: 12,
    },
    testResult: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    testName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    passed: {
        color: '#28a745',
    },
    failed: {
        color: '#dc3545',
    },
    testDetails: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
        lineHeight: 18,
    },
    testData: {
        fontSize: 11,
        color: '#999',
        fontFamily: 'monospace',
        marginTop: 4,
    },
});
