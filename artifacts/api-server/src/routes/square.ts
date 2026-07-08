import { Router } from "express";
import {
  getSquarePublicConfig,
  isSquareConfigured,
} from "../integrations/square";

const router = Router();

/** Public config for Square Web Payments SDK on checkout. */
router.get("/square/config", (_req, res): void => {
  res.json(getSquarePublicConfig());
});

export default router;

export { isSquareConfigured };
