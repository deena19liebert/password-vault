'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdvancedPasswordGenerator from '../components/AdvancedPasswordGenerator';
import VaultItemForm from '../components/VaultItemForm';
import VaultList from '../components/VaultList';

interface User {
  id: string;
  email: string;
}

interface VaultItem {
  id?: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
  tags: string[];
}

interface ApiVaultItem {
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

// Proper client-side encryption with TypeScript fixes
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

  static async encrypt(data: string, password: string): Promise<{ encrypted: string; salt: string; iv: string }> {
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(password, salt.buffer);
      
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );

      // Convert to base64 strings for storage
      const encryptedString = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
      const saltString = btoa(String.fromCharCode(...salt));
      const ivString = btoa(String.fromCharCode(...iv));

      return {
        encrypted: encryptedString,
        salt: saltString,
        iv: ivString
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
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
      throw new Error('Decryption failed - check your master key');
    }
  }

  static generateMasterKey(): string {
    // Generate a random 32-character master key
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').substring(0, 32);
  }
}

// Fallback encryption for compatibility
class SimpleClientEncryption {
  static encrypt(data: string, key: string): { encrypted: string; salt: string; iv: string } {
    // Simple XOR encryption for fallback
    const salt = 'salt-' + Math.random().toString(36).substring(2, 15);
    const iv = 'iv-' + Math.random().toString(36).substring(2, 15);
    
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return {
      encrypted: btoa(encrypted),
      salt,
      iv
    };
  }

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

  static generateMasterKey(): string {
    return 'key-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// API service
class ApiService {
  static async makeRequest(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    const response = await fetch(url, requestOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generator' | 'vault'>('vault');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [vaultItems, setVaultItems] = useState<ApiVaultItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiVaultItem | null>(null);
  const [masterKey, setMasterKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    
    // Generate master key
    try {
      const key = SecureClientEncryption.generateMasterKey();
      setMasterKey(key);
    } catch {
      // Fallback if Web Crypto is not available
      const key = SimpleClientEncryption.generateMasterKey();
      setMasterKey(key);
    }
    
    setLoading(false);
    loadVaultItems();
  }, [router]);

  const loadVaultItems = async () => {
    try {
      const data = await ApiService.makeRequest('/api/vault/items');
      setVaultItems(data.data || []);
      setError('');
    } catch (error: any) {
      console.error('Failed to load vault items:', error);
      setError(error.message || 'Failed to load vault items');
    }
  };

  const handlePasswordGenerated = (password: string) => {
    setGeneratedPassword(password);
  };

  const handleCreateItem = async (itemData: Omit<VaultItem, 'id'>) => {
    try {
      let encryptedPassword, encryptedNotes;

      try {
        // Try secure encryption first
        const passwordResult = await SecureClientEncryption.encrypt(itemData.password, masterKey);
        encryptedPassword = passwordResult.encrypted;
        
        if (itemData.notes) {
          const notesResult = await SecureClientEncryption.encrypt(itemData.notes, masterKey);
          encryptedNotes = notesResult.encrypted;
        }
      } catch {
        // Fallback to simple encryption
        const passwordResult = SimpleClientEncryption.encrypt(itemData.password, masterKey);
        encryptedPassword = passwordResult.encrypted;
        
        if (itemData.notes) {
          const notesResult = SimpleClientEncryption.encrypt(itemData.notes, masterKey);
          encryptedNotes = notesResult.encrypted;
        }
      }

      const data = await ApiService.makeRequest('/api/vault/items', {
        method: 'POST',
        body: JSON.stringify({
          title: itemData.title,
          username: itemData.username,
          encryptedPassword,
          encryptedNotes,
          url: itemData.url,
          category: itemData.category,
          tags: itemData.tags,
          strength: Math.floor(Math.random() * 10) + 1
        })
      });
      
      await loadVaultItems();
      setShowForm(false);
      setGeneratedPassword('');
      setError('');
    } catch (error: any) {
      console.error('Failed to create vault item:', error);
      setError(error.message || 'Failed to create item');
    }
  };

  const handleUpdateItem = async (itemData: Omit<VaultItem, 'id'>) => {
    if (!editingItem) return;

    try {
      let encryptedPassword, encryptedNotes;

      try {
        // Try secure encryption first
        const passwordResult = await SecureClientEncryption.encrypt(itemData.password, masterKey);
        encryptedPassword = passwordResult.encrypted;
        
        if (itemData.notes) {
          const notesResult = await SecureClientEncryption.encrypt(itemData.notes, masterKey);
          encryptedNotes = notesResult.encrypted;
        }
      } catch {
        // Fallback to simple encryption
        const passwordResult = SimpleClientEncryption.encrypt(itemData.password, masterKey);
        encryptedPassword = passwordResult.encrypted;
        
        if (itemData.notes) {
          const notesResult = SimpleClientEncryption.encrypt(itemData.notes, masterKey);
          encryptedNotes = notesResult.encrypted;
        }
      }

      await ApiService.makeRequest(`/api/vault/items/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: itemData.title,
          username: itemData.username,
          encryptedPassword,
          encryptedNotes,
          url: itemData.url,
          category: itemData.category,
          tags: itemData.tags
        })
      });
      
      await loadVaultItems();
      setEditingItem(null);
      setError('');
    } catch (error: any) {
      console.error('Failed to update vault item:', error);
      setError(error.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this password? This action cannot be undone.')) {
      return;
    }

    try {
      await ApiService.makeRequest(`/api/vault/items/${itemId}`, {
        method: 'DELETE'
      });
      
      await loadVaultItems();
      setError('');
    } catch (error: any) {
      console.error('Failed to delete vault item:', error);
      setError(error.message || 'Failed to delete item');
    }
  };

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleEditItem = (item: ApiVaultItem) => {
    setEditingItem(item);
  };

  const handleUseGeneratedPassword = () => {
    setActiveTab('vault');
    setShowForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ 
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          Loading your secure vault...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          margin: 0, 
          color: '#333',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          🔒 Secure Vault
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666' }}>Welcome, {user?.email}</span>
          <button 
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ padding: '0.5rem 1rem' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e5e5',
        padding: '0 2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '2rem'
        }}>
          <button
            onClick={() => setActiveTab('vault')}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'vault' ? '2px solid #007acc' : '2px solid transparent',
              color: activeTab === 'vault' ? '#007acc' : '#666',
              fontWeight: activeTab === 'vault' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            My Vault ({vaultItems.length})
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'generator' ? '2px solid #007acc' : '2px solid transparent',
              color: activeTab === 'generator' ? '#007acc' : '#666',
              fontWeight: activeTab === 'generator' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Password Generator
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ 
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {copied && (
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: '#10b981',
            color: 'white',
            padding: '1rem',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            ✅ Password copied to clipboard!
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {activeTab === 'generator' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                fontSize: '1.75rem',
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                Advanced Password Generator
              </h2>
              <p style={{ color: '#666' }}>
                Create strong, secure passwords for your accounts
              </p>
            </div>
            
            <AdvancedPasswordGenerator onPasswordGenerated={handlePasswordGenerated} />
            
            {generatedPassword && (
              <div style={{ 
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: '#e8f5e8',
                border: '1px solid #4caf50',
                borderRadius: '8px'
              }}>
                <h3 style={{ color: '#2e7d32', marginBottom: '1rem' }}>
                  ✅ Password Generated Successfully!
                </h3>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  Your new password: <strong>{generatedPassword}</strong>
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={handleUseGeneratedPassword}
                  >
                    Save to Vault
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleCopyPassword(generatedPassword)}
                  >
                    Copy Password
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vault' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h2 style={{ 
                  fontSize: '1.75rem',
                  marginBottom: '0.5rem',
                  color: '#333'
                }}>
                  My Password Vault
                </h2>
                <p style={{ color: '#666' }}>
                  Manage and access your saved passwords securely
                </p>
              </div>
              
              <button 
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                + Add New Password
              </button>
            </div>

            {showForm || editingItem ? (
              <VaultItemForm
                item={editingItem ? {
                  id: editingItem.id,
                  title: editingItem.title,
                  username: editingItem.username,
                  password: '', // Would be decrypted in real implementation
                  url: editingItem.url || '',
                  notes: '', // Would be decrypted in real implementation
                  category: editingItem.category,
                  tags: editingItem.tags
                } : undefined}
                onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
                onCancel={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  setGeneratedPassword('');
                }}
                generatedPassword={generatedPassword}
              />
            ) : (
              <VaultList
                items={vaultItems}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onCopyPassword={handleCopyPassword}
                masterKey={masterKey}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}