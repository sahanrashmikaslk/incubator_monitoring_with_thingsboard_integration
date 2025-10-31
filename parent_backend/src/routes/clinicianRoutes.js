import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { repository } from '../db.js';
import { CONFIG } from '../config.js';

const router = Router();
const INVITATION_LENGTH = 10;

router.post('/invitations', (req, res) => {
  const { babyId, babyName, caregiverRole, expiresInHours } = req.body;
  if (!babyId) {
    return res.status(400).json({ error: 'babyId is required' });
  }

  repository.upsertBaby(babyId, babyName || null, null);

  const code = nanoid(INVITATION_LENGTH);
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const pinHash = bcrypt.hashSync(pin, 10);
  const expiresAt = new Date();
  const hours = Number.isFinite(expiresInHours) ? expiresInHours : CONFIG.invitationExpiryHours;
  expiresAt.setHours(expiresAt.getHours() + hours);

  repository.createInvitation({
    code,
    babyId,
    babyName,
    caregiverRole,
    expiresAt: expiresAt.toISOString(),
    pinCodeHash: pinHash
  });

  return res.status(201).json({
    code,
    babyId,
    babyName,
    caregiverRole: caregiverRole || 'parent',
    expiresAt: expiresAt.toISOString(),
    pin
  });
});

router.get('/babies/:babyId/parents', (req, res) => {
  const { babyId } = req.params;
  if (!babyId) {
    return res.status(400).json({ error: 'babyId is required' });
  }

  const parents = repository.listParentsForBaby(babyId);
  return res.json({ parents });
});

router.get('/babies/:babyId/messages', (req, res) => {
  const { babyId } = req.params;
  if (!babyId) {
    return res.status(400).json({ error: 'babyId is required' });
  }

  const messages = repository
    .listMessagesForBaby({ babyId, limit: 200, offset: 0 })
    .reverse();

  return res.json({ messages });
});

router.post('/messages', (req, res) => {
  const { babyId, senderName, content } = req.body;
  if (!babyId || !senderName || !content) {
    return res.status(400).json({ error: 'babyId, senderName and content are required' });
  }

  repository.upsertBaby(babyId, null, null);
  const messageId = repository.createMessage({
    babyId,
    senderType: 'clinician',
    senderName,
    senderId: null,
    content: content.trim()
  });

  return res.status(201).json({
    id: messageId,
    baby_id: babyId,
    sender_type: 'clinician',
    sender_name: senderName,
    sender_id: null,
    content: content.trim(),
    created_at: new Date().toISOString()
  });
});

router.get('/camera-access/requests', (req, res) => {
  const entries = repository.listCameraAccessQueue();
  return res.json({ entries });
});

router.patch('/camera-access/:parentId', (req, res) => {
  const { parentId } = req.params;
  const { babyId, status, parentName } = req.body || {};

  if (!babyId || !status) {
    return res.status(400).json({ error: 'babyId and status are required' });
  }

  const parentIdNumber = Number(parentId);
  if (!Number.isInteger(parentIdNumber)) {
    return res.status(400).json({ error: 'Invalid parentId' });
  }

  const updated = repository.updateCameraAccessStatus({
    babyId,
    parentId: parentIdNumber,
    parentName: parentName || null,
    status
  });

  if (!updated) {
    return res.status(404).json({ error: 'Camera access record not found' });
  }

  const payload = {
    parentId: updated.parent_id || parentIdNumber,
    babyId: updated.baby_id || babyId,
    status: updated.status,
    pendingRequest: Boolean(updated.pending_request),
    requestedAt: updated.requested_at,
    updatedAt: updated.updated_at
  };

  return res.json({ entry: payload });
});

export default router;
