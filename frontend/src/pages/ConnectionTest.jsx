import React, { useState } from 'react';
import { authService } from '../services/authService';

const ConnectionTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    // Test 1: Backend Health Check
    try {
      const apiRoot =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
        'http://localhost:5003/api/v1';
      const healthPath = `${String(apiRoot).replace(/\/$/, '')}/health`;
      const response = await fetch(healthPath);
      const data = await response.json();
      addResult('Health Check', 'success', `Backend is running: ${data.message}`);
    } catch (error) {
      addResult('Health Check', 'error', `Backend connection failed: ${error.message}`);
    }

    // Test 2: Valid Login
    try {
      const user = await authService.login('captain@aquascope.com', 'Captain@123');
      addResult('Valid Login', 'success', `Login successful: ${user.user.name} (${user.user.role})`);
    } catch (error) {
      addResult('Valid Login', 'error', `Login failed: ${error.message}`);
    }

    // Test 3: Invalid Login
    try {
      await authService.login('wrong@email.com', 'wrongpassword');
      addResult('Invalid Login', 'error', 'Should have failed but succeeded');
    } catch (error) {
      addResult('Invalid Login', 'success', `Correctly rejected invalid credentials: ${error.message}`);
    }

    // Test 4: Request Access
    try {
      const response = await authService.requestAccess('Test User', 'test@example.com', 'analyst', 'Testing connection');
      addResult(
        'Request Access',
        'success',
        `Access request submitted: ${response?.message || response?.status || 'ok'}`
      );
    } catch (error) {
      addResult('Request Access', 'error', `Request failed: ${error.message}`);
    }

    // Test 5: Get Current User (should be logged in from test 2)
    try {
      const user = authService.getCurrentUser();
      if (user) {
        addResult('Get Current User', 'success', `Current user: ${user.name} (${user.role})`);
      } else {
        addResult('Get Current User', 'error', 'No user found in localStorage');
      }
    } catch (error) {
      addResult('Get Current User', 'error', `Failed to get current user: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background-dark text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-6">Frontend-Backend Connection Test</h1>
        
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-background-dark font-bold py-3 px-6 rounded-sm transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {loading ? 'Running Tests...' : 'Run Connection Tests'}
        </button>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Test Results:</h2>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-sm border ${
                  result.status === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm">{result.test}</span>
                  <span className="text-xs opacity-75">{result.timestamp}</span>
                </div>
                <p className="text-sm">{result.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-navy-surface border border-navy-border rounded-sm">
          <h3 className="text-lg font-bold text-white mb-2">Manual Testing Instructions:</h3>
          <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
            <li>Open browser dev tools and go to Network tab</li>
            <li>Try logging in with: captain@aquascope.com / Captain@123</li>
            <li>Check Network tab: with VITE_API_URL=/api/v1, calls go to the dev server and proxy to the API</li>
            <li>Verify responses and any error messages</li>
            <li>Test the "Request Access" functionality</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
