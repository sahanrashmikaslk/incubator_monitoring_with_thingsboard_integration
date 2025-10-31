/**
 * Baby Registration Modal
 * Allows doctors/nurses to register new babies with birth details
 */

import React, { useState } from 'react';
import './BabyRegistrationModal.css';

function BabyRegistrationModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    babyId: '',
    name: '',
    birthDate: '',
    birthTime: '',
    weight: ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.babyId.trim()) {
      newErrors.babyId = 'Baby ID is required';
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'Birth date is required';
    }
    
    if (!formData.birthTime) {
      newErrors.birthTime = 'Birth time is required';
    }
    
    if (!formData.weight) {
      newErrors.weight = 'Weight is required';
    } else {
      const weight = parseInt(formData.weight);
      if (weight < 500 || weight > 5000) {
        newErrors.weight = 'Weight must be between 500g and 5000g';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        babyId: '',
        name: '',
        birthDate: '',
        birthTime: '',
        weight: ''
      });
      setErrors({});
    } catch (error) {
      setErrors({
        submit: error.message || 'Failed to register baby'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      babyId: '',
      name: '',
      birthDate: '',
      birthTime: '',
      weight: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content baby-registration-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Register New Baby for INC-001</h2>
          <button className="close-button" onClick={handleCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="baby-registration-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="babyId">
                Baby ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="babyId"
                name="babyId"
                value={formData.babyId}
                onChange={handleChange}
                placeholder="e.g., BABY-001"
                className={errors.babyId ? 'error' : ''}
              />
              {errors.babyId && <span className="error-message">{errors.babyId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="name">Baby Name (Optional)</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="birthDate">
                Birth Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={errors.birthDate ? 'error' : ''}
              />
              {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="birthTime">
                Birth Time <span className="required">*</span>
              </label>
              <input
                type="time"
                id="birthTime"
                name="birthTime"
                value={formData.birthTime}
                onChange={handleChange}
                className={errors.birthTime ? 'error' : ''}
              />
              {errors.birthTime && <span className="error-message">{errors.birthTime}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="weight">
                Birth Weight (grams) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 2500"
                min="500"
                max="5000"
                className={errors.weight ? 'error' : ''}
              />
              {errors.weight && <span className="error-message">{errors.weight}</span>}
              <small className="field-hint">Enter weight between 500g - 5000g</small>
            </div>
          </div>

          {errors.submit && (
            <div className="submit-error">
              ❌ {errors.submit}
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  Registering...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Register Baby
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BabyRegistrationModal;
