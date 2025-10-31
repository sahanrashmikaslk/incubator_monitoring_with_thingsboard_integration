import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import parentService from '../../services/parent.service';
import './AssignParentModal.css';

function AssignParentModal({ isOpen, onClose, baby, parents = [], onInviteCreated }) {
  const [caregiverRole, setCaregiverRole] = useState('parent');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInvitation(null);
      setError('');
      setCopied(false);
    }
  }, [isOpen]);

  const baseRegistrationUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const envUrl = process.env.REACT_APP_PARENT_REGISTRATION_URL && process.env.REACT_APP_PARENT_REGISTRATION_URL.trim();
    const fallback = `${window.location.origin}/parent/register`;
    return (envUrl && envUrl.length > 0 ? envUrl : fallback).replace(/\/$/, '');
  }, []);

  const inviteUrl = useMemo(() => {
    if (!invitation?.code) return '';
    const url = `${baseRegistrationUrl}/${invitation.code}`;
    if (invitation.pin) {
      return `${url}?pin=${invitation.pin}`;
    }
    return url;
  }, [invitation, baseRegistrationUrl]);

  const expiresLabel = useMemo(() => {
    if (!invitation?.expiresAt) return null;
    const expires = new Date(invitation.expiresAt);
    if (Number.isNaN(expires.getTime())) return null;
    return expires.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  }, [invitation]);


  if (!isOpen || !baby) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!parentService.hasBackend) {
      setError('Parent backend URL is not configured.');
      return;
    }
    if (!parentService.clinicianApiKey) {
      setError('Clinician API key missing. Set REACT_APP_PARENT_CLINICIAN_KEY in your dashboard .env.');
      return;
    }

    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const result = await parentService.createInvitation({
        babyId: baby.baby_id,
        babyName: baby.name,
        caregiverRole,
        expiresInHours
      });
      setInvitation(result);
      if (onInviteCreated) {
        onInviteCreated(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById('parent-invite-qr');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${baby.baby_id || 'invite'}-parent-invite.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="assign-parent-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assignParentTitle">
      <div className="assign-parent-modal">
        <header className="assign-parent-header">
          <div>
            <h3 id="assignParentTitle">Assign parent access - {baby.baby_id}</h3>
            <p>
              Generate a secure invitation. The QR code and link let parents register with their phone number and a password.
            </p>
          </div>
          <button type="button" className="icon-button close" onClick={onClose} aria-label="Close assign parent modal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {parents.length > 0 && (
          <section className="assign-parent-section">
            <span className="assign-section-label">Existing caregivers</span>
            <div className="assign-parent-roster">
              {parents.map(parent => (
                <div key={parent.id || parent.phone} className="assign-parent-chip">
                  <strong>{parent.name || 'Parent'}</strong>
                  {parent.phone && <span>{parent.phone}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="assign-parent-section">
          <span className="assign-section-label">Invitation details</span>
          <form className="assign-parent-form" onSubmit={handleSubmit}>
            <label>
              Caregiver role
              <select
                value={caregiverRole}
                onChange={(event) => setCaregiverRole(event.target.value)}
                disabled={loading}
              >
                <option value="parent">Parent / Guardian</option>
                <option value="family">Family member</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </label>

            <label>
              Invitation expiry (hours)
              <input
                type="number"
                min={1}
                max={168}
                value={expiresInHours}
                onChange={(event) => setExpiresInHours(Number(event.target.value))}
                disabled={loading}
              />
            </label>

            {!invitation && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Generating…' : 'Generate invitation'}
              </button>
            )}
          </form>
        </section>

        {error && (
          <div className="assign-parent-error" role="alert">
            {error}
          </div>
        )}

        {invitation && (
          <section className="assign-parent-section invitation-preview">
            <div className="invite-preview-card">
              <div className="qr-wrapper">
                <QRCodeCanvas id="parent-invite-qr" value={inviteUrl} size={180} includeMargin />
              </div>
              <div className="invite-details">
              <h4>Share with family</h4>
              <p className="invite-code">
                Invitation code: <strong>{invitation.code}</strong>
              </p>
              {invitation.pin && (
                <p className="invite-pin">
                  Verification PIN: <strong>{invitation.pin}</strong>
                </p>
              )}
              <p className="invite-link">{inviteUrl}</p>
              {expiresLabel && <p className="invite-expiry">Expires {expiresLabel}</p>}
                <div className="invite-actions">
                  <button type="button" className="btn-secondary" onClick={handleCopy}>
                    {copied ? 'Link copied' : 'Copy link'}
                  </button>
                  <button type="button" className="btn-outline" onClick={handleDownloadQr}>
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AssignParentModal;

