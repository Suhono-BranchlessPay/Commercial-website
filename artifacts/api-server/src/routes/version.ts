import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/version", (_req, res) => {
  res.json({
    buildTime: typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : null,
    startedAt: new Date().toISOString(),
  });
});

export default router;
