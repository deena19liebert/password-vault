'use client';
import React, { useState, useMemo } from 'react';

interface VaultItem {
  id: string;
  title: string;
  username: string;
  encryptedPassword: string;
  encryptedNotes?: string;
  url?: string;
  category: string;
  tags: string[];
  strength: number;
  createdAt: string;
  updatedAt: string;
}

interface VaultListProps {
  items: VaultItem[];
  onEdit: (item: VaultItem) => void;
  onDelete: (itemId: string) => void;
  onCopyPassword: (password: string) => void;
  masterKey: string;
}

// Fixed encryption with proper TypeScript types
class SecureClientEncryption {
  private static async deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async decrypt(encryptedData: string, password: string, salt: string, iv: string): Promise<string> {
    try {
      // Convert from base64 strings to ArrayBuffers
      const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
      const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      const key = await this.deriveKey(password, saltBytes.buffer);
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes
        },
        key,
        encryptedBytes
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '*** Decryption Failed ***';
    }
  }
}

// Fallback decryption
class SimpleClientEncryption {
  static decrypt(encryptedData: string, key: string, salt: string, iv: string): string {
    try {
      const decoded = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch {
      return '*** Decryption Failed ***';
    }
  }
}

const VaultList: React.FC<VaultListProps> = ({
  items,
  onEdit,
  onDelete,
  onCopyPassword,
  masterKey
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(item => item.category)));
    return ['all', ...cats];
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.username.toLowerCase().includes(term) ||
        item.url?.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    return filtered;
  }, [items, searchTerm, selectedCategory]);

  const decryptPassword = async (item: VaultItem): Promise<string> => {
    if (decryptedPasswords[item.id]) {
      return decryptedPasswords[item.id];
    }

    try {
      // For demo purposes, we'll use simple decryption
      // In real implementation, you'd use the actual salt and iv from the encrypted data
      const password = SimpleClientEncryption.decrypt(
        item.encryptedPassword,
        masterKey,
        'default-salt',
        'default-iv'
      );

      setDecryptedPasswords(prev => ({
        ...prev,
        [item.id]: password
      }));

      return password;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '*** Decryption Failed ***';
    }
  };

  const togglePasswordVisibility = async (item: VaultItem) => {
    if (showPasswordId === item.id) {
      setShowPasswordId(null);
    } else {
      setShowPasswordId(item.id);
      // Pre-decrypt the password when showing
      await decryptPassword(item);
    }
  };

  const handleCopyPassword = async (item: VaultItem) => {
    try {
      const password = await decryptPassword(item);
      onCopyPassword(password);
    } catch (error) {
      console.error('Failed to decrypt password for copying:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 3) return '#dc2626';
    if (strength <= 6) return '#f59e0b';
    if (strength <= 8) return '#3b82f6';
    return '#10b981';
  };

  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#666'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>No passwords saved yet</h3>
        <p>Start by generating a password and saving it to your vault.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Header */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search passwords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
            minWidth: '150px'
          }}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '1rem', color: '#666' }}>
        {filteredItems.length} of {items.length} items
      </div>

      {/* Items Grid */}
      <div style={{
        display: 'grid',
        gap: '1rem'
      }}>
        {filteredItems.map((item) => (
          <div key={item.id} className="card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem'
            }}>
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  margin: '0 0 0.25rem 0',
                  color: '#333'
                }}>
                  {item.title}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    background: '#e5e7eb',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    color: '#666'
                  }}>
                    {item.category}
                  </span>
                  {item.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: '#dbeafe',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        color: '#1e40af'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onEdit(item)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem' }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                  Username
                </label>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {item.username}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                  Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type={showPasswordId === item.id ? 'text' : 'password'}
                    value={showPasswordId === item.id ? (decryptedPasswords[item.id] || 'Decrypting...') : '••••••••'}
                    readOnly
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => togglePasswordVisibility(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title={showPasswordId === item.id ? 'Hide' : 'Show'}
                    >
                      {showPasswordId === item.id ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleCopyPassword(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="Copy password"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {item.url && (
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                  Website
                </label>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#007acc', textDecoration: 'none' }}
                >
                  {item.url}
                </a>
              </div>
            )}

            {/* Password Strength */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#666' }}>Password Strength:</span>
                <span style={{ 
                  fontWeight: 'bold',
                  color: getStrengthColor(item.strength)
                }}>
                  {item.strength <= 3 ? 'Weak' : item.strength <= 6 ? 'Fair' : item.strength <= 8 ? 'Good' : 'Strong'}
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '4px', 
                height: '4px'
              }}>
                <div 
                  style={{ 
                    height: '100%',
                    borderRadius: '4px',
                    backgroundColor: getStrengthColor(item.strength),
                    width: `${item.strength * 10}%`
                  }}
                ></div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: '#666',
              borderTop: '1px solid #e5e5e5',
              paddingTop: '0.75rem'
            }}>
              <span>Updated: {formatDate(item.updatedAt)}</span>
              <span>Created: {formatDate(item.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && searchTerm && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666'
        }}>
          <p>No passwords found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default VaultList;