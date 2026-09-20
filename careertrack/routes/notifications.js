const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getForUser, markAllRead, markRead } = require('../services/notifications');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const notifications = await getForUser(req.currentUser.id, 100);
  res.render('notifications', { title: 'Notifications', notifications });
});

router.post('/read-all', async (req, res) => {
  await markAllRead(req.currentUser.id);
  res.redirect('/notifications');
});

router.post('/:id/read', async (req, res) => {
  await markRead(req.currentUser.id, req.params.id);
  res.redirect(req.get('Referer') || '/notifications');
});

module.exports = router;
