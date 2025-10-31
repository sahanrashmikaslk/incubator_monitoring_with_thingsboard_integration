import React, { useEffect, useMemo, useRef, useState } from 'react';
import parentService from '../../services/parent.service';
import './ParentMessagingPanel.css';

function ParentMessagingPanel({ baby, isOpen, onClose, clinicianName, parents = [] }) {
  const messageListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const babyLabel = useMemo(() => {
    if (!baby) return '';
    return baby.baby_id || baby.name || 'INC-001';
  }, [baby]);

  useEffect(() => {
    if (!isOpen || !baby?.baby_id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const items = await parentService.fetchMessages(undefined, { babyId: baby.baby_id });
        if (!isMounted) return;
        const formatted = (items || []).map(record => {
          const created = record.createdAt ? new Date(record.createdAt) : new Date();
          const createdAt = Number.isNaN(created.getTime()) ? Date.now() : created.getTime();
          return {
            id: record.id,
            senderType: record.senderType,
            senderName: record.senderName || (record.senderType === 'parent' ? 'Parent' : 'Care team'),
            content: record.content,
            createdAt,
            formattedTime: new Date(createdAt).toLocaleString([], {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: 'short'
            })
          };
        });
        setMessages(formatted);
        setError('');
        requestAnimationFrame(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
          }
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Unable to load messages.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, baby?.baby_id]);

  useEffect(() => {
    if (!isOpen) return;
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, isOpen]);

  if (!isOpen || !baby) {
    return null;
  }

  const handleSend = async (event) => {
    event.preventDefault();
    const body = newMessage.trim();
    if (!body) return;

    setSending(true);
    try {
      const response = await parentService.sendMessage({
        content: body,
        senderName: clinicianName || 'NICU Team',
        babyId: baby.baby_id
      });

      const created = response.createdAt ? new Date(response.createdAt) : new Date();
      const createdAt = Number.isNaN(created.getTime()) ? Date.now() : created.getTime();
      const entry = {
        id: response.id || Date.now().toString(),
        senderType: response.senderType || 'clinician',
        senderName: response.senderName || (clinicianName || 'NICU Team'),
        content: response.content || body,
        createdAt,
        formattedTime: new Date(createdAt).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: 'short'
        })
      };

      setMessages(prev => [...prev, entry]);
      setNewMessage('');
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      });
    } catch (err) {
      setError(err.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="parent-messaging-overlay" role="dialog" aria-modal="true" aria-labelledby="parentMessagingTitle">
      <div className="parent-messaging-panel">
        <header className="parent-messaging-header">
          <div>
            <h3 id="parentMessagingTitle">Parent messages · {babyLabel}</h3>
            <p>Coordinate with the family. Updates appear instantly on the parent portal.</p>
          </div>
          <button type="button" className="icon-button close" onClick={onClose} aria-label="Close parent messaging">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {parents.length > 0 && (
          <section className="parent-messaging-roster">
            <span className="roster-label">Assigned caregivers</span>
            <div className="roster-list">
              {parents.map(parent => (
                <span key={parent.id || parent.phone} className="roster-chip">
                  {parent.name || parent.phone}
                  {parent.phone ? <small>{parent.phone}</small> : null}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="parent-messaging-body">
          <div className="overlay-message-list" ref={messageListRef}>
            {messages.map(message => (
              <article
                key={message.id}
                className={`overlay-message ${message.senderType === 'parent' ? 'parent' : 'clinician'}`}
              >
                <div className="message-meta">
                  <span className="message-author">{message.senderName}</span>
                  <span className="message-time">{message.formattedTime}</span>
                </div>
                <p className="message-content">{message.content}</p>
              </article>
            ))}

            {!loading && messages.length === 0 && (
              <p className="overlay-empty">No conversation yet. Send the first note to welcome the family.</p>
            )}

            {loading && (
              <div className="message-loading">
                <span className="spinner" aria-hidden="true"></span>
                Loading messages…
              </div>
            )}
          </div>

          {error && (
            <div className="message-error" role="alert">
              {error}
            </div>
          )}

          <form className="message-composer" onSubmit={handleSend}>
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Share an update or respond to the family…"
              rows={3}
              maxLength={500}
              disabled={sending}
            />
            <button type="submit" className="btn-primary" disabled={sending || !newMessage.trim()}>
              {sending ? 'Sending…' : 'Send update'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ParentMessagingPanel;

