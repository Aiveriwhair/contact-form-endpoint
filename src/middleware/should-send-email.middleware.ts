import { NextFunction, Request, Response } from 'express';

export const shouldSendEmails = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.SEND_EMAILS === 'true') {
    next();
  } else {
    res.status(200).json({
      success: true,
      message: 'Email sending is disabled by configuration.',
    });
  }
};
