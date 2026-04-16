import { Router, Request, Response } from 'express';
import ContactController from '../controllers/contact.controller';
import { contactValidationRules } from '../middleware/validation.middleware';
import { contactRateLimiter } from '../middleware/rate-limiter.middleware';
import { shouldSendEmails } from '../middleware/should-send-email.middleware';

const createContactRouter = (contactController: ContactController): Router => {
  const router = Router();

  router.post(
    '/submit',
    contactRateLimiter,
    contactValidationRules,
    shouldSendEmails,
    (req: Request, res: Response) => {
      void contactController.submitContact(req, res);
    }
  );

  router.get('/health', (req: Request, res: Response) => {
    void contactController.healthCheck(req, res);
  });

  return router;
};

export default createContactRouter;
