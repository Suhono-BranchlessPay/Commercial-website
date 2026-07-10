import { Router } from "express";
import {
  getSquarePublicConfig,
  isSquareConfigured,
} from "../integrations/square";
import { getTenantId } from "../lib/tenant";

const router = Router();

/** Public config for Square Web Payments SDK on checkout. */
router.get("/square/config", (req, res): void => {
  const slug = req.tenant?.slug ?? getTenantId();
  res.json(getSquarePublicConfig(slug));
});

export default router;

export { isSquareConfigured };
