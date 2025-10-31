import { Router } from 'express';
import { repository } from '../db.js';

const router = Router();

router.get('/me', (req, res) => {
  const parentRecord = repository.getParentById(req.parent.parentId);
  if (!parentRecord) {
    return res.status(404).json({ error: 'Parent not found' });
  }

  return res.json({
    id: parentRecord.id,
    name: parentRecord.name,
    phone: parentRecord.phone,
    babyId: parentRecord.baby_id
  });
});

router.get('/camera-access', (req, res) => {
  const access = repository.getCameraAccessForParent(req.parent.parentId);

  if (!access) {
    return res.json({
      status: 'revoked',
      pendingRequest: false,
      requestedAt: null,
      updatedAt: null
    });
  }

  return res.json({
    status: access.status || 'revoked',
    pendingRequest: Boolean(access.pending_request),
    requestedAt: access.requested_at || null,
    updatedAt: access.updated_at || null
  });
});

router.post('/camera-access/request', (req, res) => {
  const record = repository.recordCameraAccessRequest({
    babyId: req.parent.babyId,
    parentId: req.parent.parentId,
    parentName: req.parent.name
  });

  if (!record) {
    return res.status(500).json({ error: 'Unable to create request' });
  }

  const payload = {
    status: record.status || 'revoked',
    pendingRequest: Boolean(record.pending_request),
    requestedAt: record.requested_at || null,
    updatedAt: record.updated_at || null
  };

  if (record.already_pending) {
    return res.status(200).json({ ...payload, alreadyPending: true });
  }

  return res.status(201).json(payload);
});

router.get('/messages', (req, res) => {
  const babyId = req.parent.babyId;
  const { limit = 50, offset = 0 } = req.query;

  const messages = repository
    .listMessagesForBaby({
      babyId,
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0
    })
    .reverse(); // return oldest to newest for UI

  return res.json({ messages });
});

router.post('/messages', (req, res) => {
  const babyId = req.parent.babyId;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const messageId = repository.createMessage({
    babyId,
    senderType: 'parent',
    senderName: req.parent.name,
    senderId: req.parent.parentId,
    content: content.trim()
  });

  return res.status(201).json({
    id: messageId,
    baby_id: babyId,
    sender_type: 'parent',
    sender_name: req.parent.name,
    sender_id: req.parent.parentId,
    content: content.trim(),
    created_at: new Date().toISOString()
  });
});

export default router;
