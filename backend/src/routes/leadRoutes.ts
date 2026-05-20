import { Router } from 'express';
import {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  exportLeadsCsv
} from '../controllers/leadController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All lead routes require authentication
router.use(protect);

router.get('/export', exportLeadsCsv);

router
  .route('/')
  .get(getLeads)
  .post(createLead);

router
  .route('/:id')
  .get(getLead)
  .put(updateLead)
  .delete(deleteLead);

export default router;
