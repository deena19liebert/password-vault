'use client';
import React, { useState, useEffect } from 'react';

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

interface VaultItemFormProps {
  item?: VaultItem;
  onSubmit: (item: Omit<VaultItem, 'id'>) => void;
  onCancel: () => void;
  generatedPassword?: string;
}

const VaultItemForm: React.FC<VaultItemFormProps> = ({
  item,
  onSubmit,
  onCancel,
  generatedPassword
}) => {
  const [formData, setFormData] = useState<VaultItem>({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category: 'General',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (generatedPassword) {
      setFormData(prev => ({ ...prev, password: generatedPassword }));
    }
  }, [item, generatedPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof VaultItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="card">
      <h2 style={{ 
        fontSize: '1.5rem',
        marginBottom: '1.5rem',
        color: '#333'
      }}>
        {item ? 'Edit Password' : 'Add New Password'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="e.g., Google Account"
          />
        </div>

        <div className="form-group">
          <label>Username/Email *</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            required
            placeholder="e.g., user@example.com"
          />
        </div>

        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
            placeholder="Enter password or use generator"
          />
        </div>

        <div className="form-group">
          <label>Website URL</label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="General">General</option>
            <option value="Social Media">Social Media</option>
            <option value="Email">Email</option>
            <option value="Finance">Finance</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
          </select>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              placeholder="Add tags..."
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={addTag}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {formData.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: '#e5e7eb',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes about this account"
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {item ? 'Update' : 'Create'} Item
          </button>
        </div>
      </form>
    </div>
  );
};

export default VaultItemForm;