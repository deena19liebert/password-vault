'use client';
import React, { useState, useCallback, useMemo } from 'react';

interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
  excludeSimilar: boolean;
  customChars: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
}

const AdvancedPasswordGenerator: React.FC<{
  onPasswordGenerated: (password: string) => void;
}> = ({ onPasswordGenerated }) => {
  const [password, setPassword] = useState<string>('');
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });
  const [copied, setCopied] = useState<boolean>(false);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
    excludeSimilar: true,
    customChars: ''
  });

  const characterSets = useMemo(() => ({
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    ambiguous: '{}[]()/\\\'"`~,;:.<>',
    similar: 'il1Lo0O'
  }), []);

  const calculateStrength = useCallback((pwd: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Length score
    if (pwd.length < 8) {
      feedback.push('Password should be at least 8 characters long');
    } else if (pwd.length < 12) {
      score += 1;
    } else if (pwd.length < 16) {
      score += 2;
    } else {
      score += 3;
    }

    // Character variety
    let varietyScore = 0;
    if (/[a-z]/.test(pwd)) varietyScore++;
    if (/[A-Z]/.test(pwd)) varietyScore++;
    if (/[0-9]/.test(pwd)) varietyScore++;
    if (/[^a-zA-Z0-9]/.test(pwd)) varietyScore++;

    score += varietyScore;

    if (varietyScore < 3) {
      feedback.push('Add more character types (uppercase, lowercase, numbers, symbols)');
    }

    // Entropy calculation
    const charSetSize = (
      (/[a-z]/.test(pwd) ? 26 : 0) +
      (/[A-Z]/.test(pwd) ? 26 : 0) +
      (/[0-9]/.test(pwd) ? 10 : 0) +
      (/[^a-zA-Z0-9]/.test(pwd) ? 32 : 0)
    );

    if (charSetSize > 0) {
      const entropy = pwd.length * Math.log2(charSetSize);
      if (entropy > 100) score += 3;
      else if (entropy > 80) score += 2;
      else if (entropy > 60) score += 1;
    }

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/,
      /111111/,
      /000000/
    ];

    if (commonPatterns.some(pattern => pattern.test(pwd))) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid common patterns and sequences');
    }

    // Sequential characters check
    if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pwd) ||
        /(012|123|234|345|456|567|678|789)/.test(pwd)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid sequential characters');
    }

    // Repeated characters check
    if (/(.)\1{2,}/.test(pwd)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeated characters');
    }

    return {
      score: Math.min(score, 10),
      feedback: feedback.length > 0 ? feedback : ['Strong password!']
    };
  }, []);

  const generatePassword = useCallback(() => {
    let characterPool = '';
    
    if (options.includeLowercase) characterPool += characterSets.lowercase;
    if (options.includeUppercase) characterPool += characterSets.uppercase;
    if (options.includeNumbers) characterPool += characterSets.numbers;
    if (options.includeSymbols) characterPool += characterSets.symbols;
    if (options.customChars) characterPool += options.customChars;

    if (characterPool.length === 0) {
      setPassword('Select at least one character type');
      setStrength({ score: 0, feedback: ['Select at least one character type'] });
      return;
    }

    // Apply exclusions
    if (options.excludeAmbiguous) {
      characterPool = characterPool.split('').filter(char => 
        !characterSets.ambiguous.includes(char)
      ).join('');
    }

    if (options.excludeSimilar) {
      characterPool = characterPool.split('').filter(char => 
        !characterSets.similar.includes(char)
      ).join('');
    }

    // Ensure at least one character from each selected set
    const requiredChars: string[] = [];
    if (options.includeLowercase) {
      requiredChars.push(characterSets.lowercase[Math.floor(Math.random() * characterSets.lowercase.length)]);
    }
    if (options.includeUppercase) {
      requiredChars.push(characterSets.uppercase[Math.floor(Math.random() * characterSets.uppercase.length)]);
    }
    if (options.includeNumbers) {
      requiredChars.push(characterSets.numbers[Math.floor(Math.random() * characterSets.numbers.length)]);
    }
    if (options.includeSymbols) {
      requiredChars.push(characterSets.symbols[Math.floor(Math.random() * characterSets.symbols.length)]);
    }

    let generatedPassword = '';
    const poolLength = characterPool.length;
    const remainingLength = Math.max(0, options.length - requiredChars.length);

    // Add required characters first
    generatedPassword = requiredChars.join('');

    // Fill the rest with random characters
    const crypto = window.crypto || (window as any).msCrypto;
    const randomValues = new Uint32Array(remainingLength);
    
    if (crypto && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < remainingLength; i++) {
        const randomIndex = randomValues[i] % poolLength;
        generatedPassword += characterPool[randomIndex];
      }
    } else {
      // Fallback to Math.random if crypto is not available
      for (let i = 0; i < remainingLength; i++) {
        const randomIndex = Math.floor(Math.random() * poolLength);
        generatedPassword += characterPool[randomIndex];
      }
    }

    // Shuffle the password
    generatedPassword = generatedPassword.split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    const strengthAnalysis = calculateStrength(generatedPassword);
    setPassword(generatedPassword);
    setStrength(strengthAnalysis);
    onPasswordGenerated(generatedPassword);
  }, [options, characterSets, calculateStrength, onPasswordGenerated]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 15000); // Clear after 15 seconds
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score <= 3) return '#dc2626';
    if (score <= 6) return '#f59e0b';
    if (score <= 8) return '#3b82f6';
    return '#10b981';
  };

  const getStrengthText = (score: number) => {
    if (score <= 3) return 'Very Weak';
    if (score <= 6) return 'Moderate';
    if (score <= 8) return 'Strong';
    return 'Very Strong';
  };

  const handleOptionChange = (key: keyof PasswordOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="card">
      <h2 style={{ 
        fontSize: '1.5rem',
        marginBottom: '1.5rem',
        color: '#333'
      }}>
        Advanced Password Generator
      </h2>
      
      {/* Password Display */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={password}
            readOnly
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              fontFamily: 'monospace',
              backgroundColor: '#fafafa'
            }}
            placeholder="Generated password will appear here"
          />
          <button
            onClick={copyToClipboard}
            disabled={!password}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: copied ? '#10b981' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              minWidth: '80px'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        {/* Strength Meter */}
        {password && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#666' }}>Password Strength:</span>
              <span style={{ 
                fontWeight: 'bold',
                color: getStrengthColor(strength.score)
              }}>
                {getStrengthText(strength.score)}
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#e5e7eb', 
              borderRadius: '4px', 
              height: '6px',
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  height: '100%',
                  borderRadius: '4px',
                  backgroundColor: getStrengthColor(strength.score),
                  width: `${(strength.score / 10) * 100}%`,
                  transition: 'all 0.3s ease'
                }}
              ></div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {strength.feedback.map((msg, index) => (
                <div key={index} style={{ marginTop: '0.25rem' }}>• {msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Options Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Left Column */}
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Length: <span style={{ fontFamily: 'monospace' }}>{options.length}</span>
            </label>
            <input
              type="range"
              min="8"
              max="64"
              value={options.length}
              onChange={(e) => handleOptionChange('length', parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              <span>8</span>
              <span>64</span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333' }}>Character Types</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.includeLowercase}
                  onChange={(e) => handleOptionChange('includeLowercase', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Lowercase (a-z)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.includeUppercase}
                  onChange={(e) => handleOptionChange('includeUppercase', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Uppercase (A-Z)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.includeNumbers}
                  onChange={(e) => handleOptionChange('includeNumbers', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Numbers (0-9)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.includeSymbols}
                  onChange={(e) => handleOptionChange('includeSymbols', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Symbols (!@#$...)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333' }}>Security Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.excludeSimilar}
                  onChange={(e) => handleOptionChange('excludeSimilar', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Exclude similar characters (i, l, 1, L, o, 0, O)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={options.excludeAmbiguous}
                  onChange={(e) => handleOptionChange('excludeAmbiguous', e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span>Exclude ambiguous characters ({'{}[]()/\\\'"`~,;:.<>'})</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Custom Characters
            </label>
            <input
              type="text"
              value={options.customChars}
              onChange={(e) => handleOptionChange('customChars', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              placeholder="Add custom characters..."
              maxLength={50}
            />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              Add any additional characters to include
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePassword}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007acc'}
      >
        Generate Secure Password
      </button>

      {/* Security Tips */}
      <div style={{ 
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#e8f4fd',
        borderRadius: '6px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ 
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#0066cc',
          marginBottom: '0.5rem'
        }}>
          🔒 Security Tips
        </h4>
        <ul style={{ 
          fontSize: '0.75rem',
          color: '#0066cc',
          paddingLeft: '1rem',
          margin: 0
        }}>
          <li>Use at least 16 characters for strong security</li>
          <li>Include multiple character types</li>
          <li>Avoid common words and patterns</li>
          <li>Use a unique password for each service</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedPasswordGenerator;